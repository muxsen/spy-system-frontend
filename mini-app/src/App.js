import React, { useState, useEffect } from 'react';
import './App.css'; // Создай этот файл для стилей ниже

const tg = window.Telegram.WebApp;

function App() {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    tg.ready();
    tg.expand();
    // Настраиваем цвета под тему Телеграм
    document.body.style.backgroundColor = tg.themeParams.bg_color || '#000';
    document.body.style.color = tg.themeParams.text_color || '#fff';
  }, []);

  const handleSave = () => {
    if(!sourceId || !targetId) {
        tg.showAlert('Заполните оба поля!');
        return;
    }
    
    const data = JSON.stringify({ source: sourceId, target: targetId });
    // Отправляем данные обратно боту
    tg.sendData(data); 
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🛰 SPY CONFIG</h1>
        <p>Настройка перехвата</p>
      </div>

      <div className="card">
        <label>ID Канала-Жертвы (Откуда брать)</label>
        <input 
          type="text" 
          placeholder="-100123456789" 
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        />
        <small>Не знаете ID? <a href="https://t.me/RawDataBot">@RawDataBot</a></small>
      </div>

      <div className="card">
        <label>ID Вашего Канала (Куда постить)</label>
        <input 
          type="text" 
          placeholder="-100987654321" 
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        />
        <small>Добавьте бота в админы канала!</small>
      </div>

      <button className="btn-main" onClick={handleSave}>
        СОХРАНИТЬ И ЗАПУСТИТЬ
      </button>
    </div>
  );
}

export default App;