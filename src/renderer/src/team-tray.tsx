import React from 'react'
import ReactDOM from 'react-dom/client'
import TeamTray from './team-tray-app'
import './styles.css'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <TeamTray />
  </React.StrictMode>
)
