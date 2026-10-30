import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runPlaceholderProjectCleanup } from './lib/placeholderProjectCleanup';

// Remove saved copies of the four placeholder projects before any store reads them.
runPlaceholderProjectCleanup();

createRoot(document.getElementById('root')!).render(<App />);
