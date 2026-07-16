import React from 'react'
import ReactDOM from 'react-dom/client'
import PasswordLock from './password-lock-app'
import './styles.css'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <PasswordLock />
  </React.StrictMode>
)
