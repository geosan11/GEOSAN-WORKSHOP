import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runLegacyProjectIdMigration } from './lib/projectIdMigration';

// Rewrite data saved under old project ids before any store reads it.
runLegacyProjectIdMigration();

createRoot(document.getElementById('root')!).render(<App />);
