import tailwindcss from '@tailwindcss/postcss';
import cascadeLayers from '@csstools/postcss-cascade-layers';
import autoprefixer from 'autoprefixer';
import postcssPresetEnv from 'postcss-preset-env';

const stripSpecificity = () => {
  return {
    postcssPlugin: 'strip-specificity',
    Rule(rule) {
      if (rule.selector) {
        // Strip out the ':not(#\#)' or variations like ':not(#\\#)' specificity hacks
        rule.selector = rule.selector.replace(/:not\(\s*#[^)]*\)/g, '');
      }
    }
  };
};
stripSpecificity.postcss = true;

export default {
  plugins: [
    tailwindcss(),
    cascadeLayers(),
    postcssPresetEnv({
      stage: 1,
      features: {
        'custom-properties': {
          preserve: true,
        },
        'color-functional-notation': true,
        'oklab-function': true,
      },
    }),
    stripSpecificity(),
    autoprefixer(),
  ],
};
