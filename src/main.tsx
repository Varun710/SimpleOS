import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { WebOS } from './WebOS.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebOS />
  </StrictMode>,
)
