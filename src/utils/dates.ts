// Day.js with the plugins and locales the site uses. Plain relative imports so `node --test` can load it.
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import utc from 'dayjs/plugin/utc.js';
import 'dayjs/locale/es.js';

dayjs.extend(utc);
dayjs.extend(localizedFormat);

export default dayjs;
