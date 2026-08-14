export const normalizeClassValue = (classValue: string | null | undefined): string => {
  if (!classValue) return '';
  const trimmed = classValue.trim();
  const match = trimmed.match(/\d+/);
  return match ? match[0] : trimmed;
};

console.log('Class 10 ->', normalizeClassValue('Class 10'));
console.log('10 ->', normalizeClassValue('10'));
console.log('Class 12 ->', normalizeClassValue('Class 12'));
console.log('12 ->', normalizeClassValue('12'));
console.log('Class 8 ->', normalizeClassValue('Class 8'));
console.log('8 ->', normalizeClassValue('8'));
console.log('null ->', normalizeClassValue(null));
console.log('undefined ->', normalizeClassValue(undefined));
console.log('"" ->', normalizeClassValue(''));
console.log('  Class 11  ->', normalizeClassValue('  Class 11  '));
