const tailwindcss = require('tailwindcss');
const postcss = require('postcss');

const config = {
  content: [{ raw: '<div class="rounded-2xl neu-raised"></div>' }],
  theme: {
    borderRadius: {
      '2xl': '32px',
    }
  },
  plugins: [
    function({ addUtilities, matchUtilities, theme }) {
      matchUtilities(
        {
          'rounded': (value) => {
            return {
              '--tw-radius': value,
              'border-radius': value,
            };
          },
        },
        { values: theme('borderRadius') }
      )
    }
  ]
};

postcss([tailwindcss(config)]).process('@tailwind utilities;', { from: undefined }).then(result => {
  console.log(result.css);
});
