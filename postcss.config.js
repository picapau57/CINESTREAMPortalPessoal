import tailwindcss from '@tailwindcss/postcss';
import cascadeLayers from '@csstools/postcss-cascade-layers';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss(),
    cascadeLayers(),
    autoprefixer(),
  ],
};
