import { createRoot } from 'react-dom/client';
import HostShellV4 from './HostShellV4.jsx';
import './styles.css';
import '@app/guestsKit/kit.css';

// The kit's styles are scoped under .gk; hostv4 is all kit, so the whole page wears it.
document.documentElement.classList.add('gk');
createRoot(document.getElementById('root')).render(<HostShellV4 />);
