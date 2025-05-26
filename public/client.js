// // public/client.js
// const socket = io();

// const botStatusDiv = document.getElementById('bot-status');
// const errorMessagesDiv = document.getElementById('error-messages');
// const liveSignalsContainer = document.getElementById('live-signals');
// const activeTradesContainer = document.getElementById('active-trades');
// const closedTradesContainer = document.getElementById('closed-trades');

// const maxClosedTrades = 10; // To limit the number of closed trades displayed

// // --- Helper Functions to update UI ---

// function updateBotStatus(message) {
//     botStatusDiv.textContent = `Bot Status: ${message}`;
// }

// function displayError(message) {
//     errorMessagesDiv.style.display = 'block';
//     errorMessagesDiv.innerHTML += `<p>Error: ${message}</p>`;
// }

// function updateLiveSignal(data) {
//     let card = document.getElementById(`live-signal-${data.symbol}`);
//     if (!card) {
//         card = document.createElement('div');
//         card.id = `live-signal-${data.symbol}`;
//         card.className = 'signal-card';
//         liveSignalsContainer.prepend(card); // Add new signals to the top
//     }

//     const signalClass = data.signal === 'BUY' ? 'signal-buy' : (data.signal === 'SELL' ? 'signal-sell' : 'signal-hold');

//     card.innerHTML = `
//         <h3>${data.symbol} <span class="${signalClass}">${data.signal}</span></h3>
//         <p>Entry: ${data.currentPrice}</p>
//         <p>RSI: ${data.rsi} | EMA: ${data.ema}</p>
//         <p>MACD: ${data.macd} / ${data.macdSignal}</p>
//         <p>Volume: ${data.volume} / SMA: ${data.volumeSMA}</p>
//     `;
//     if (data.signal === 'HOLD') {
//         // If it's a HOLD signal, and no active trade for this symbol,
//         // remove its signal card or grey it out after some time.
//         // For simplicity, we just update it.
//     }
// }

// function updateActiveTrades(trades) {
//     activeTradesContainer.innerHTML = ''; // Clear existing
//     if (Object.keys(trades).length === 0) {
//         activeTradesContainer.innerHTML = '<p>No active trades.</p>';
//         return;
//     }

//     for (const symbol in trades) {
//         const trade = trades[symbol];
//         const card = document.createElement('div');
//         card.className = 'trade-card';
//         card.id = `active-trade-${symbol}`; // Give an ID for easy update/removal

//         const entryDate = new Date(trade.entryTime);
//         const formattedEntryTime = entryDate.toLocaleString('en-IN', {
//             day: '2-digit', month: '2-digit', year: 'numeric',
//             hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
//         });

//         card.innerHTML = `
//             <h3>${symbol} (${trade.signal})</h3>
//             <p>Entry: ${trade.entry.toFixed(2)}</p>
//             <p>Entry Time: ${formattedEntryTime}</p>
//             <p>Target: ${trade.target.toFixed(2)}</p>
//             <p>Stoploss: ${trade.stoploss.toFixed(2)}</p>
//             <p>Status: ${trade.status}</p>
//         `;
//         activeTradesContainer.appendChild(card);
//     }
// }


// function addClosedTrade(data) {
//     const card = document.createElement('div');
//     const statusClass = data.profitLoss >= 0 ? 'closed-profit' : 'closed-loss';
//     card.className = `trade-card ${statusClass}`;

//     card.innerHTML = `
//         <h3>${data.symbol} (${data.signal}) Trade Closed! ${data.emoji}</h3>
//         <p>Entry: ${data.entryPrice}</p>
//         <p>Exit: ${data.exitPrice}</p>
//         <p>Outcome: ${data.outcome}</p>
//         <p>P&L: ${data.profitLoss} (${data.profitLossPercent}%)</p>
//         <p>Duration: ${data.duration}</p>
//     `;
//     closedTradesContainer.prepend(card); // Add new closed trades to the top

//     // Limit the number of displayed closed trades
//     while (closedTradesContainer.children.length > maxClosedTrades) {
//         closedTradesContainer.removeChild(closedTradesContainer.lastChild);
//     }
//     // Remove "No closed trades yet." if it exists
//     if (closedTradesContainer.querySelector('p')) {
//         closedTradesContainer.innerHTML = '';
//         closedTradesContainer.appendChild(card);
//     }
// }

// // --- Socket.IO Event Listeners ---

// socket.on('connect', () => {
//     console.log('Connected to Socket.IO server');
//     updateBotStatus('Connected to server.');
// });

// socket.on('disconnect', () => {
//     console.log('Disconnected from Socket.IO server');
//     updateBotStatus('Disconnected from server. Reconnecting...');
// });

// socket.on('error', (error) => {
//     console.error('Socket.IO error:', error);
//     displayError(`Socket error: ${error}`);
// });

// socket.on('bot_status', (message) => {
//     updateBotStatus(message);
// });

// socket.on('error_message', (message) => {
//     displayError(message);
// });

// socket.on('initial_data', (data) => {
//     console.log('Received initial data:', data);
//     updateActiveTrades(data.activeTrades[data.userIds[0]] || {}); // Assuming first user's trades for now
//     // In a real multi-user dashboard, you'd need a way to select a user or aggregate
// });

// socket.on('live_analysis', (data) => {
//     updateLiveSignal(data);
// });

// socket.on('new_signal', (data) => {
//     // A new signal also means a new active trade for a specific user
//     // For simplicity, we just update the live signals and assume it's for the primary user
//     updateLiveSignal(data);
//     // You might want to refresh activeTrades if you track them on the client side
//     // For now, activeTrades are updated only on initial_data, which is less ideal for live updates
//     // A better approach would be to emit specific activeTrade updates or the full activeTrades object frequently.
// });

// socket.on('trade_closed', (data) => {
//     addClosedTrade(data);
//     // Remove from active trades display
//     const activeTradeCard = document.getElementById(`active-trade-${data.symbol}`);
//     if (activeTradeCard) {
//         activeTradesContainer.removeChild(activeTradeCard);
//         if (activeTradesContainer.children.length === 0) {
//             activeTradesContainer.innerHTML = '<p>No active trades.</p>';
//         }
//     }
// });

// socket.on('hold_signal', (data) => {
//     updateLiveSignal({ ...data, signal: 'HOLD' }); // Update existing signal card to HOLD
// });

// // Optional: If you want to update active trades more frequently,
// // you might need to add a periodic emit from server or specific update events.
// // For now, this is simpler, but a full dashboard would require more granular state management.










// public/client.js (Updated for Web App ONLY)
const socket = io();

const botStatusDiv = document.getElementById('bot-status');
const errorMessagesDiv = document.getElementById('error-messages');
const liveSignalsContainer = document.getElementById('live-signals');
const activeTradesContainer = document.getElementById('active-trades');
const closedTradesContainer = document.getElementById('closed-trades');

const maxClosedTrades = 10;

// --- Helper Functions to update UI ---

function updateBotStatus(message) {
    botStatusDiv.textContent = `Bot Status: ${message}`;
}

function displayError(message) {
    errorMessagesDiv.style.display = 'block';
    errorMessagesDiv.innerHTML += `<p>Error: ${message}</p>`;
}

function updateLiveSignal(data) {
    let card = document.getElementById(`live-signal-${data.symbol}`);
    if (!card) {
        card = document.createElement('div');
        card.id = `live-signal-${data.symbol}`;
        card.className = 'signal-card';
        liveSignalsContainer.prepend(card);
    }

    const signalClass = data.signal === 'BUY' ? 'signal-buy' : (data.signal === 'SELL' ? 'signal-sell' : 'signal-hold');

    card.innerHTML = `
        <h3>${data.symbol} <span class="${signalClass}">${data.signal}</span></h3>
        <p>Entry: ${data.currentPrice}</p>
        <p>RSI: ${data.rsi} | EMA: ${data.ema}</p>
        <p>MACD: ${data.macd} / ${data.macdSignal}</p>
        <p>Volume: ${data.volume} / SMA: ${data.volumeSMA}</p>
    `;
}

function updateActiveTrades(trades) {
    activeTradesContainer.innerHTML = '';
    if (Object.keys(trades).length === 0) {
        activeTradesContainer.innerHTML = '<p>No active trades.</p>';
        return;
    }

    for (const symbol in trades) {
        const trade = trades[symbol];
        const card = document.createElement('div');
        card.className = 'trade-card';
        card.id = `active-trade-${symbol}`;

        const entryDate = new Date(trade.entryTime);
        const formattedEntryTime = entryDate.toLocaleString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });

        card.innerHTML = `
            <h3>${symbol} (${trade.signal})</h3>
            <p>Entry: ${trade.entry.toFixed(2)}</p>
            <p>Entry Time: ${formattedEntryTime}</p>
            <p>Target: ${trade.target.toFixed(2)}</p>
            <p>Stoploss: ${trade.stoploss.toFixed(2)}</p>
            <p>Status: ${trade.status}</p>
        `;
        activeTradesContainer.appendChild(card);
    }
}

function addClosedTrade(data) {
    const card = document.createElement('div');
    const statusClass = data.profitLoss >= 0 ? 'closed-profit' : 'closed-loss';
    card.className = `trade-card ${statusClass}`;

    card.innerHTML = `
        <h3>${data.symbol} (${data.signal}) Trade Closed! ${data.emoji}</h3>
        <p>Entry: ${data.entryPrice}</p>
        <p>Exit: ${data.exitPrice}</p>
        <p>Outcome: ${data.outcome}</p>
        <p>P&L: ${data.profitLoss} (${data.profitLossPercent}%)</p>
        <p>Duration: ${data.duration}</p>
    `;
    closedTradesContainer.prepend(card);

    while (closedTradesContainer.children.length > maxClosedTrades) {
        closedTradesContainer.removeChild(closedTradesContainer.lastChild);
    }
    // Remove "No closed trades yet." if it exists
    if (closedTradesContainer.querySelector('p')) {
        closedTradesContainer.innerHTML = '';
        closedTradesContainer.appendChild(card);
    }
}

// --- Socket.IO Event Listeners ---

socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
    updateBotStatus('Connected to server.');
});

socket.on('disconnect', () => {
    console.log('Disconnected from Socket.IO server');
    updateBotStatus('Disconnected from server. Reconnecting...');
});

socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
    displayError(`Socket error: ${error}`);
});

socket.on('bot_status', (message) => {
    updateBotStatus(message);
});

socket.on('error_message', (message) => {
    displayError(message);
});

socket.on('initial_data', (data) => {
    console.log('Received initial data:', data);
    updateActiveTrades(data.activeTrades || {}); // Now directly use data.activeTrades
});

socket.on('live_analysis', (data) => {
    updateLiveSignal(data);
});

socket.on('new_signal', (data) => {
    updateLiveSignal(data);
    // When a new signal comes, it also means a new active trade.
    // Re-fetch/update active trades from server or emit trade directly if possible.
    // For now, let's assume `activeTrades` is eventually consistent via a refresh or specific emit.
    // A more robust solution might involve sending the entire updated `activeTrades` object on each change.
});

socket.on('trade_closed', (data) => {
    addClosedTrade(data);
    // Remove from active trades display
    const activeTradeCard = document.getElementById(`active-trade-${data.symbol}`);
    if (activeTradeCard) {
        activeTradesContainer.removeChild(activeTradeCard);
        if (activeTradesContainer.children.length === 0) {
            activeTradesContainer.innerHTML = '<p>No active trades.</p>';
        }
    }
});

socket.on('hold_signal', (data) => {
    updateLiveSignal({ ...data, signal: 'HOLD' });
});

// Removed user_status_changed event as there are no "users" in this context anymore