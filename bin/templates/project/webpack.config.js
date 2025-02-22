/**
 * For configuration details and customization options, see:
 * https://github.com/uniwebcms/site-content-collector/blob/main/docs/webpack-config.md
 */
import { configModule } from '@uniwebcms/site-content-collector';
import webpack from 'webpack';

export default (_, argv) => configModule(webpack, argv, import.meta.url);
