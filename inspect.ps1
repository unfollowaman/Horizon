$port = 9222
$url = "https://horizon.pages.dev"
$screenshotPath = "E:\Horizon\Horizon\screenshot_cdp.png"
$logPath = "E:\Horizon\Horizon\inspection_report.json"

# Kill any existing chrome debugging instances
Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$port*" } | Stop-Process -Force -ErrorAction SilentlyContinue

$userDataDir = "$env:TEMP\chrome_cdp_inspect_" + (Get-Random)
$chromeArgs = @(
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=$port",
    "--user-data-dir=$userDataDir",
    "about:blank"
)

$chromeProc = Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList $chromeArgs -PassThru

try {
    Start-Sleep -Milliseconds 1500

    # Get WebSocket debugger URL from http://127.0.0.1:9222/json/version or /json/list
    $versionJson = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/version" -TimeoutSec 10
    $browserWsUrl = $versionJson.webSocketDebuggerUrl

    Write-Host "Connected to Chrome debugger: $browserWsUrl"

    # Also get pages
    $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/list" -TimeoutSec 10
    $pageTarget = $targets | Where-Object { $_.type -eq "page" } | Select-Object -First 1
    $pageWsUrl = $pageTarget.webSocketDebuggerUrl

    Write-Host "Page target WS: $pageWsUrl"

    Add-Type -AssemblyName System.Net.WebSockets
    Add-Type -AssemblyName System.Threading

    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $task = $ws.ConnectAsync([Uri]$pageWsUrl, $cts.Token)
    $task.Wait()

    $cmdId = 1
    function Send-CDPCommand($method, $params = @{}) {
        $script:cmdId++
        $msg = @{
            id = $script:cmdId
            method = $method
            params = $params
        } | ConvertTo-Json -Compress -Depth 10
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
        $segment = [System.ArraySegment[byte]]::new($bytes)
        $sendTask = $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None)
        $sendTask.Wait()
        return $script:cmdId
    }

    # Enable Network, Page, Runtime, Log, Console
    [void](Send-CDPCommand "Page.enable")
    [void](Send-CDPCommand "Network.enable")
    [void](Send-CDPCommand "Runtime.enable")
    [void](Send-CDPCommand "Log.enable")

    # Navigate
    [void](Send-CDPCommand "Page.navigate" @{ url = $url })

    # Collect incoming messages for 6 seconds
    $buffer = New-Object byte[] 65536
    $receivedJson = [System.Collections.Generic.List[string]]::new()
    $stopWatch = [System.Diagnostics.Stopwatch]::StartNew()

    $consoleErrors = [System.Collections.Generic.List[object]]::new()
    $networkFailures = [System.Collections.Generic.List[object]]::new()
    $allRequests = [System.Collections.Generic.List[object]]::new()
    $allResponses = [System.Collections.Generic.List[object]]::new()

    $sb = New-Object System.Text.StringBuilder

    while ($stopWatch.ElapsedMilliseconds -lt 7000) {
        $segment = [System.ArraySegment[byte]]::new($buffer)
        $ctsReceive = New-Object System.Threading.CancellationTokenSource(1000)
        try {
            $receiveTask = $ws.ReceiveAsync($segment, $ctsReceive.Token)
            $receiveTask.Wait()
            $result = $receiveTask.Result
            $text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
            $sb.Append($text) | Out-Null
            if ($result.EndOfMessage) {
                $rawMsg = $sb.ToString()
                $sb.Clear()
                try {
                    $json = $rawMsg | ConvertFrom-Json
                    if ($json.method -eq "Log.entryAdded") {
                        if ($json.params.entry.level -eq "error") {
                            $consoleErrors.Add(@{ type = "Log.entryAdded"; text = $json.params.entry.text; url = $json.params.entry.url; level = $json.params.entry.level })
                        }
                    }
                    elseif ($json.method -eq "Runtime.consoleAPICalled") {
                        if ($json.params.type -eq "error" -or $json.params.type -eq "warning") {
                            $consoleErrors.Add(@{ type = "Runtime.consoleAPICalled"; msgType = $json.params.type; args = $json.params.args })
                        }
                    }
                    elseif ($json.method -eq "Runtime.exceptionThrown") {
                        $consoleErrors.Add(@{ type = "Runtime.exceptionThrown"; exception = $json.params.exceptionDetails.text; details = $json.params.exceptionDetails.exception.description })
                    }
                    elseif ($json.method -eq "Network.requestWillBeSent") {
                        $allRequests.Add(@{ requestId = $json.params.requestId; url = $json.params.request.url; method = $json.params.request.method })
                    }
                    elseif ($json.method -eq "Network.responseReceived") {
                        $allResponses.Add(@{ requestId = $json.params.requestId; url = $json.params.response.url; status = $json.params.response.status; statusText = $json.params.response.statusText })
                    }
                    elseif ($json.method -eq "Network.loadingFailed") {
                        $networkFailures.Add(@{ requestId = $json.params.requestId; errorText = $json.params.errorText; canceled = $json.params.canceled; type = $json.params.type })
                    }
                } catch {}
            }
        } catch {}
    }

    # Capture Screenshot via CDP Page.captureScreenshot
    $ssId = Send-CDPCommand "Page.captureScreenshot" @{ format = "png" }
    $sb.Clear()
    $ssStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $screenshotBase64 = $null

    while ($ssStopwatch.ElapsedMilliseconds -lt 5000 -and -not $screenshotBase64) {
        $segment = [System.ArraySegment[byte]]::new($buffer)
        $ctsReceive = New-Object System.Threading.CancellationTokenSource(1000)
        try {
            $receiveTask = $ws.ReceiveAsync($segment, $ctsReceive.Token)
            $receiveTask.Wait()
            $result = $receiveTask.Result
            $text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
            $sb.Append($text) | Out-Null
            if ($result.EndOfMessage) {
                $rawMsg = $sb.ToString()
                $sb.Clear()
                try {
                    $json = $rawMsg | ConvertFrom-Json
                    if ($json.id -eq $ssId) {
                        $screenshotBase64 = $json.result.data
                    }
                } catch {}
            }
        } catch {}
    }

    if ($screenshotBase64) {
        $bytes = [System.Convert]::FromBase64String($screenshotBase64)
        [System.IO.File]::WriteAllBytes($screenshotPath, $bytes)
        Write-Host "Screenshot saved successfully to $screenshotPath ($($bytes.Length) bytes)"
    } else {
        Write-Host "Could not capture screenshot via CDP"
    }

    $report = @{
        url = $url
        requests = $allRequests
        responses = $allResponses
        networkFailures = $networkFailures
        consoleErrors = $consoleErrors
    }

    $report | ConvertTo-Json -Depth 10 | Set-Content -Path $logPath
    Write-Host "Report saved to $logPath"

} finally {
    if ($chromeProc -and -not $chromeProc.HasExited) {
        $chromeProc.Kill()
    }
}
