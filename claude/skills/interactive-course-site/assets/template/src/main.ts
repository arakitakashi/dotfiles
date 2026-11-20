import './styles/tokens.css';
import './styles/themes.css';
import './styles/app.css';
import './styles/stage.css';
import { App } from './ui/app';
import { course } from './content/course';

new App(document.getElementById('root')!, course);

// フォントの定義は大きいので、最初の描画のあとで読み込む
void import('./styles/fonts.css');
