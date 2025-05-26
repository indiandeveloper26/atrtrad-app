// // botLogic.js
// require('dotenv').config();
// const axios = require('axios');
// const fs = require('fs');
// const TelegramBot = require('node-telegram-bot-api');
// const { RSI, EMA, MACD, SMA, ATR } = require('technicalindicators');
// const MLR = require('ml-regression').MultivariateLinearRegression;

// // --- Config (Same as before) ---
// const INTERVAL = "1h";
// const SYMBOLS = [
//     "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
//     "ADAUSDT", "DOGEUSDT", "SHIBUSDT", "DOTUSDT", "LINKUSDT",
//     "TRXUSDT", "MATICUSDT", "LTCUSDT", "BCHUSDT", "ETCUSDT",
//     "XLMUSDT", "UNIUSDT", "AVAXUSDT", "NEARUSDT", "ICPUSDT",
//     "APTUSDT", "ATOMUSDT", "OPUSDT", "ARBUSDT", "FILUSDT",
//     "IMXUSDT", "EGLDUSDT", "SUIUSDT", "GRTUSDT", "SANDUSDT",
//     "MANAUSDT", "AAVEUSDT", "MKRUSDT", "LDOUSdt", "QNTUSDT",
//     "CRVUSDT", "COMPUSDT", "SNXUSDT", "ZECUSDT", "DASHUSDT",
//     "EOSUSDT", "XTZUSDT", "VETUSDT", "THETAUSDT", "FTMUSDT",
//     "KSMUSDT", "CHZUSDT", "FLOWUSDT", "GMXUSDT", "DYDXUSDT"
// ];
// const VOLUME_SMA_PERIOD = 20;
// const USER_IDS_FILE = './user_chat_ids.json';

// const botToken = process.env.BOT_TOKEN || '7082982229:AAGJXNPWuATGRdPnzyhJ7Mb0PVbY4a5h9fY';
// const bot = new TelegramBot(botToken, { polling: true });

// let USER_CHAT_IDS = [];
// let activeTrades = {};
// let lastSignalSent = {};
// let userStatus = {};

// // --- Socket.IO instance (will be passed from index.js) ---
// let io;

// // --- Functions (Same as before, except for emit changes) ---

// function loadUserChatIds() {
//     if (fs.existsSync(USER_IDS_FILE)) {
//         USER_CHAT_IDS = JSON.parse(fs.readFileSync(USER_IDS_FILE));
//     }
// }
// function saveUserChatIds() {
//     fs.writeFileSync(USER_IDS_FILE, JSON.stringify(USER_CHAT_IDS));
// }

// async function fetchKlines(symbol, interval, limit = 100) {
//     try {
//         const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
//         const res = await axios.get(url);
//         return res.data.map(c => ({
//             open: parseFloat(c[1]),
//             high: parseFloat(c[2]),
//             low: parseFloat(c[3]),
//             close: parseFloat(c[4]),
//             volume: parseFloat(c[5]),
//             time: c[0]
//         }));
//     } catch (e) {
//         console.error("Kline fetch error for", symbol, e.message);
//         return null;
//     }
// }

// async function fetchCurrentPrice(symbol) {
//     try {
//         const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
//         const res = await axios.get(url);
//         return parseFloat(res.data.price);
//     } catch (e) {
//         console.error("Price fetch error for", symbol, e.message);
//         return null;
//     }
// }

// function trainMLModel(atrArray, priceArray, targets, stoplosses) {
//     const inputs = atrArray.map((atr, i) => [atr, priceArray[i]]);
//     const targetMultipliers = targets.map((target, i) => (target - priceArray[i]) / atrArray[i]);
//     const stoplossMultipliers = stoplosses.map((sl, i) => Math.abs(sl - priceArray[i]) / atrArray[i]);

//     const targetModel = new MLR(inputs, targetMultipliers);
//     const stoplossModel = new MLR(inputs, stoplossMultipliers);

//     return { targetModel, stoplossModel };
// }

// function predictMultipliers(atr, price, targetModel, stoplossModel) {
//     const input = [atr, price];
//     let targetMultiplier = targetModel.predict(input);
//     let stoplossMultiplier = stoplossModel.predict(input);

//     if (targetMultiplier < 0.5) targetMultiplier = 0.5;
//     if (targetMultiplier > 3) targetMultiplier = 3;
//     if (stoplossMultiplier < 0.3) stoplossMultiplier = 0.3;
//     if (stoplossMultiplier > 2) stoplossMultiplier = 2;

//     return { targetMultiplier, stoplossMultiplier };
// }

// function calculateTargetsML(signal, price, atr, mlModels) {
//     let { targetModel, stoplossModel } = mlModels;

//     if (!targetModel || !stoplossModel) {
//         return calculateTargetsATRBasedFallback(signal, price, atr);
//     }

//     const { targetMultiplier, stoplossMultiplier } = predictMultipliers(atr, price, targetModel, stoplossModel);

//     let target, stoploss;
//     if (signal === 'BUY') {
//         target = price + targetMultiplier * atr;
//         stoploss = price - stoplossMultiplier * atr;
//     } else {
//         target = price - targetMultiplier * atr;
//         stoploss = price + stoplossMultiplier * atr;
//     }
//     return { target, stoploss };
// }

// function calculateTargetsATRBasedFallback(signal, price, atr) {
//     const atrPercent = (atr / price) * 100;
//     let targetMultiplier = 1.5;
//     let stoplossMultiplier = 1.0;

//     if (atrPercent < 0.5) {
//         targetMultiplier = 2.0;
//         stoplossMultiplier = 0.7;
//     } else if (atrPercent > 2.0) {
//         targetMultiplier = 1.2;
//         stoplossMultiplier = 1.5;
//     }

//     let target, stoploss;
//     if (signal === 'BUY') {
//         target = price + targetMultiplier * atr;
//         stoploss = price - stoplossMultiplier * atr;
//     } else {
//         target = price - targetMultiplier * atr;
//         stoploss = price + stoplossMultiplier * atr;
//     }
//     return { target, stoploss };
// }

// function analyzeData(candles, mlTrainingData) {
//     const closes = candles.map(c => c.close);
//     const highs = candles.map(c => c.high);
//     const lows = candles.map(c => c.low);
//     const volumes = candles.map(c => c.volume);

//     const rsi = RSI.calculate({ values: closes, period: 14 });
//     const ema = EMA.calculate({ values: closes, period: 14 });
//     const macd = MACD.calculate({
//         values: closes,
//         fastPeriod: 12,
//         slowPeriod: 26,
//         signalPeriod: 9,
//         SimpleMAOscillator: false,
//         SimpleMASignal: false
//     });
//     const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
//     const volumeSMA = SMA.calculate({ values: volumes, period: VOLUME_SMA_PERIOD });

//     const lastClose = closes.at(-1);
//     const lastEma = ema.at(-1);
//     const lastMacd = macd.at(-1);
//     const lastRsi = rsi.at(-1);
//     const lastAtr = atr.at(-1);
//     const lastVolume = volumes.at(-1);
//     const lastVolumeSMA = volumeSMA.at(-1);

//     let signal = 'HOLD';
//     const volumeOkay = lastVolume > (0.8 * lastVolumeSMA);

//     if (volumeOkay && lastClose > lastEma && lastMacd.MACD > lastMacd.signal && lastRsi > 50) {
//         signal = 'BUY';
//     } else if (volumeOkay && lastClose < lastEma && lastMacd.MACD < lastMacd.signal && lastRsi < 50) {
//         signal = 'SELL';
//     }

//     let target = null, stoploss = null;
//     if (signal !== 'HOLD') {
//         if (mlTrainingData) {
//             const actualTarget = signal === 'BUY' ? lastClose + 1.5 * lastAtr : lastClose - 1.5 * lastAtr;
//             const actualStoploss = signal === 'BUY' ? lastClose - 1.0 * lastAtr : lastClose + 1.0 * lastAtr;
//             mlTrainingData.atr.push(lastAtr);
//             mlTrainingData.price.push(lastClose);
//             mlTrainingData.targets.push(actualTarget);
//             mlTrainingData.stoplosses.push(actualStoploss);
//         }
//     }

//     return { signal, lastClose, lastRsi, lastEma, lastMacd, lastVolume, lastVolumeSMA, lastAtr };
// }

// function checkIfHit(price, trade) {
//     if (!trade) return false;

//     let hitType = false;
//     let profitLoss = 0;
//     let profitLossPercent = 0;

//     if (trade.signal === 'BUY') {
//         if (price >= trade.target) {
//             hitType = 'target';
//             profitLoss = price - trade.entry;
//             profitLossPercent = (profitLoss / trade.entry) * 100;
//         } else if (price <= trade.stoploss) {
//             hitType = 'stoploss';
//             profitLoss = price - trade.entry;
//             profitLossPercent = (profitLoss / trade.entry) * 100;
//         }
//     } else { // SELL signal
//         if (price <= trade.target) {
//             hitType = 'target';
//             profitLoss = trade.entry - price;
//             profitLossPercent = (profitLoss / trade.entry) * 100;
//         } else if (price >= trade.stoploss) {
//             hitType = 'stoploss';
//             profitLoss = trade.entry - price;
//             profitLossPercent = (profitLoss / trade.entry) * 100;
//         }
//     }

//     if (hitType) {
//         return {
//             type: hitType,
//             profitLoss: profitLoss,
//             profitLossPercent: profitLossPercent,
//             exitPrice: price
//         };
//     }
//     return false;
// }

// // --- checkSymbol function: Emits to Socket.IO ---
// async function checkSymbol(symbol, mlModels, mlTrainingData) {
//     const candles = await fetchKlines(symbol, INTERVAL);
//     const price = await fetchCurrentPrice(symbol);
//     if (!candles || !price) {
//         // Emit error to web
//         if (io) io.emit('error_message', `Error fetching data for ${symbol}`);
//         return;
//     }

//     const analysis = analyzeData(candles, mlTrainingData);
//     if (!analysis) return;

//     if (!mlModels.targetModel && mlTrainingData.atr.length >= 30) {
//         const models = trainMLModel(mlTrainingData.atr, mlTrainingData.price, mlTrainingData.targets, mlTrainingData.stoplosses);
//         mlModels.targetModel = models.targetModel;
//         mlModels.stoplossModel = models.stoplossModel;
//         console.log("ML Models trained!");
//         if (io) io.emit('bot_status', "ML Models trained!"); // Emit status to web
//     }

//     console.log(`Analysis for ${symbol} @ ${new Date(candles.at(-1).time).toLocaleString()}: Signal=${analysis.signal}, Price=${price.toFixed(2)}`);

//     // Emit live analysis data for current symbol to web
//     if (io) {
//         io.emit('live_analysis', {
//             symbol: symbol,
//             signal: analysis.signal,
//             currentPrice: price.toFixed(2),
//             rsi: analysis.lastRsi.toFixed(2),
//             ema: analysis.lastEma.toFixed(2),
//             macd: analysis.lastMacd ? analysis.lastMacd.MACD.toFixed(2) : 'N/A', // Check for null/undefined
//             macdSignal: analysis.lastMacd ? analysis.lastMacd.signal.toFixed(2) : 'N/A',
//             volume: analysis.lastVolume.toFixed(0),
//             volumeSMA: analysis.lastVolumeSMA.toFixed(0)
//         });
//     }

//     for (const chatId of USER_CHAT_IDS) {
//         if (!userStatus[chatId]) {
//             continue;
//         }

//         if (!activeTrades[chatId]) activeTrades[chatId] = {};
//         if (!lastSignalSent[chatId]) lastSignalSent[chatId] = {};

//         const trade = activeTrades[chatId][symbol];

//         if (trade && trade.status === 'active') {
//             const hitResult = checkIfHit(price, trade);
//             if (hitResult) {
//                 const { type, profitLoss, profitLossPercent, exitPrice } = hitResult;
//                 const profitLossEmoji = profitLoss >= 0 ? '🟢' : '🔴';
//                 const tradeDuration = new Date(Date.now() - trade.entryTime).toISOString().slice(11, 19);

//                 const summaryMessage = `📈 *${symbol} ${trade.signal} Trade Closed!* ${profitLossEmoji}\n` +
//                                      `---------------------------------------------\n` +
//                                      `*Entry Price:* ${trade.entry.toFixed(2)}\n` +
//                                      `*Exit Price:* ${exitPrice.toFixed(2)}\n` +
//                                      `*Outcome:* ${type.toUpperCase()}\n` +
//                                      `*P&L:* ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} (${profitLossPercent.toFixed(2)}%)\n` +
//                                      `*Duration:* ${tradeDuration}\n` +
//                                      `---------------------------------------------`;
//                 await bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' });

//                 // Emit trade closure to web
//                 if (io) {
//                     io.emit('trade_closed', {
//                         symbol: symbol,
//                         signal: trade.signal,
//                         entryPrice: trade.entry.toFixed(2),
//                         exitPrice: exitPrice.toFixed(2),
//                         outcome: type.toUpperCase(),
//                         profitLoss: profitLoss.toFixed(2),
//                         profitLossPercent: profitLossPercent.toFixed(2),
//                         duration: tradeDuration,
//                         emoji: profitLossEmoji
//                     });
//                 }

//                 trade.status = 'closed';
//                 delete activeTrades[chatId][symbol];
//                 lastSignalSent[chatId][symbol] = null;
//             }
//             continue;
//         }

//         if (analysis.signal !== 'HOLD' && !activeTrades[chatId][symbol]) {
//             const { target, stoploss } = calculateTargetsML(analysis.signal, price, analysis.lastAtr, mlModels);

//             const signalMessage = `📊 *${symbol}* Signal: *${analysis.signal}*\n` +
//                                 `💰 Entry: ${price.toFixed(2)}\n` +
//                                 `🎯 Target: ${target.toFixed(2)}\n` +
//                                 `🛑 Stoploss: ${stoploss.toFixed(2)}\n` +
//                                 `📉 RSI: ${analysis.lastRsi.toFixed(2)} | EMA: ${analysis.lastEma.toFixed(2)}\n` +
//                                 `📈 MACD: ${analysis.lastMacd.MACD.toFixed(2)} / ${analysis.lastMacd.signal.toFixed(2)}\n` +
//                                 `📊 Volume: ${analysis.lastVolume.toFixed(0)} / SMA: ${analysis.lastVolumeSMA.toFixed(0)}`;
//             await bot.sendMessage(chatId, signalMessage, { parse_mode: 'Markdown' });

//             // Emit new signal to web
//             if (io) {
//                 io.emit('new_signal', {
//                     symbol: symbol,
//                     signal: analysis.signal,
//                     entry: price.toFixed(2),
//                     target: target.toFixed(2),
//                     stoploss: stoploss.toFixed(2),
//                     rsi: analysis.lastRsi.toFixed(2),
//                     ema: analysis.lastEma.toFixed(2),
//                     macd: analysis.lastMacd ? analysis.lastMacd.MACD.toFixed(2) : 'N/A',
//                     macdSignal: analysis.lastMacd ? analysis.lastMacd.signal.toFixed(2) : 'N/A',
//                     volume: analysis.lastVolume.toFixed(0),
//                     volumeSMA: analysis.lastVolumeSMA.toFixed(0)
//                 });
//             }

//             activeTrades[chatId][symbol] = {
//                 signal: analysis.signal,
//                 entry: price,
//                 target,
//                 stoploss,
//                 atr: analysis.lastAtr,
//                 status: 'active',
//                 entryTime: Date.now()
//             };
//             lastSignalSent[chatId][symbol] = analysis.signal;
//         } else if (analysis.signal === 'HOLD' && lastSignalSent[chatId][symbol] !== 'HOLD') {
//             if (!activeTrades[chatId][symbol]) {
//                  await bot.sendMessage(chatId, `ℹ️ *${symbol}* Signal: *HOLD*`, { parse_mode: 'Markdown' });
//                  lastSignalSent[chatId][symbol] = 'HOLD';
//                  // Emit HOLD signal to web
//                  if (io) io.emit('hold_signal', { symbol: symbol });
//             }
//         }
//     }
// }

// // --- Telegram Bot Command Handlers (Same as before, but with io emit where relevant) ---

// bot.onText(/\/trades/, (msg) => {
//     const chatId = msg.chat.id;
//     if (!activeTrades[chatId] || Object.keys(activeTrades[chatId]).length === 0) {
//         bot.sendMessage(chatId, "Aapke paas koi active trade nahi hai.");
//         return;
//     }

//     const trades = activeTrades[chatId];
//     const buttons = Object.entries(trades).map(([symbol, trade]) => {
//         return [{ text: `${symbol} - ${trade.status}`, callback_data: `trade_status_${symbol}` }];
//     });

//     bot.sendMessage(chatId, "Aapke active trades status:", {
//         reply_markup: {
//             inline_keyboard: buttons
//         }
//     });
// });

// bot.on('callback_query', async (callbackQuery) => {
//     const msg = callbackQuery.message;
//     const chatId = msg.chat.id;
//     const data = callbackQuery.data;

//     if (data.startsWith('trade_status_')) {
//         const symbol = data.split('_')[2];
//         const trade = activeTrades[chatId] ? activeTrades[chatId][symbol] : null;

//         if (!trade) {
//             await bot.answerCallbackQuery(callbackQuery.id, { text: "Trade mil nahi raha." });
//             return;
//         }

//         const entryDate = new Date(trade.entryTime);
//         const formattedEntryTime = entryDate.toLocaleString('en-IN', {
//             day: '2-digit',
//             month: '2-digit',
//             year: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit',
//             second: '2-digit',
//             hour12: true
//         });

//         const statusMsg = `Trade status for *${symbol}*:\n` +
//                           `Signal: ${trade.signal}\n` +
//                           `Entry: ${trade.entry.toFixed(2)}\n` +
//                           `*Entry Time:* ${formattedEntryTime}\n` +
//                           `Target: ${trade.target.toFixed(2)}\n` +
//                           `Stoploss: ${trade.stoploss.toFixed(2)}\n` +
//                           `Status: ${trade.status}`;
//         await bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
//         await bot.answerCallbackQuery(callbackQuery.id);
//     } else if (data === 'toggle_status') {
//         userStatus[chatId] = !userStatus[chatId];
//         await bot.answerCallbackQuery(callbackQuery.id, { text: `Signals ${userStatus[chatId] ? 'activated' : 'deactivated'}.` });
//         const buttonLabel = userStatus[chatId] ? "🟢 Active" : "🔴 Inactive";
//         await bot.editMessageText(`Your signal status is: *${buttonLabel}*`, {
//             chat_id: chatId,
//             message_id: msg.message_id,
//             parse_mode: 'Markdown',
//             reply_markup: {
//                 inline_keyboard: [
//                     [{ text: userStatus[chatId] ? "Deactivate" : "Activate", callback_data: 'toggle_status' }]
//                 ]
//             }
//         });
//         // Emit status change to web
//         if (io) io.emit('user_status_changed', { chatId: chatId, status: userStatus[chatId] });
//     }
// });

// bot.onText(/\/status/, (msg) => {
//     const chatId = msg.chat.id;
//     const isActive = userStatus[chatId] ?? false;
//     const buttonLabel = isActive ? "🟢 Active" : "🔴 Inactive";

//     bot.sendMessage(chatId, `Your signal status is: *${buttonLabel}*`, {
//         parse_mode: 'Markdown',
//         reply_markup: {
//             inline_keyboard: [
//                 [{ text: isActive ? "Deactivate" : "Activate", callback_data: 'toggle_status' }]
//             ]
//         }
//     });
// });

// bot.onText(/\/start/, (msg) => {
//     const chatId = msg.chat.id;
//     if (!USER_CHAT_IDS.includes(chatId)) {
//         USER_CHAT_IDS.push(chatId);
//         saveUserChatIds();
//     }
//     userStatus[chatId] = true;
//     bot.sendMessage(chatId, "Welcome to the Crypto Trading Signal Bot! You will receive signals for selected symbols. Use /status to manage signals and /trades to view active trades.");
// });

// // --- Main loop and initialization (now exported) ---
// async function mainLoop() {
//     const mlTrainingData = { atr: [], price: [], targets: [], stoplosses: [] };
//     const mlModels = { targetModel: null, stoplossModel: null };

//     while (true) {
//         console.log("Starting new analysis cycle...");
//         if (io) io.emit('bot_status', 'Starting new analysis cycle...'); // Emit status to web

//         for (const symbol of SYMBOLS) {
//             console.log(`Checking symbol: ${symbol}`);
//             if (io) io.emit('bot_status', `Checking symbol: ${symbol}`); // Emit status to web
//             await checkSymbol(symbol, mlModels, mlTrainingData);

//             console.log(`Sleeping 1 minute before next symbol...`);
//             await new Promise(r => setTimeout(r, 60 * 1000));
//         }

//         console.log("Cycle done, restarting symbols...");
//         if (io) io.emit('bot_status', 'Cycle done, restarting symbols...'); // Emit status to web
//     }
// }

// // Initialization function to be called from index.js
// function initializeBot(socketIoInstance) {
//     io = socketIoInstance; // Assign the Socket.IO instance
//     loadUserChatIds();
//     USER_CHAT_IDS.forEach(id => {
//         if (userStatus[id] === undefined) {
//             userStatus[id] = true;
//         }
//     });
//     mainLoop(); // Start the main bot logic loop
// }

// module.exports = {
//     bot, // Export Telegram bot for specific handling if needed
//     initializeBot, // Export initialization function
//     activeTrades, // Export activeTrades for web display
//     USER_CHAT_IDS // Export user IDs for web display
// };










// botLogic.js (Updated for Web App ONLY)
require('dotenv').config();
const axios = require('axios');
const fs = require('fs'); // Still useful if you want to save active trades to a file
const { RSI, EMA, MACD, SMA, ATR } = require('technicalindicators');
const MLR = require('ml-regression').MultivariateLinearRegression;

// --- Config ---
const INTERVAL = "1h";
const SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "ADAUSDT", "DOGEUSDT", "SHIBUSDT", "DOTUSDT", "LINKUSDT",
    "TRXUSDT", "MATICUSDT", "LTCUSDT", "BCHUSDT", "ETCUSDT",
    "XLMUSDT", "UNIUSDT", "AVAXUSDT", "NEARUSDT", "ICPUSDT",
    "APTUSDT", "ATOMUSDT", "OPUSDT", "ARBUSDT", "FILUSDT",
    "IMXUSDT", "EGLDUSDT", "SUIUSDT", "GRTUSDT", "SANDUSDT",
    "MANAUSDT", "AAVEUSDT", "MKRUSDT", "LDOUSdt", "QNTUSDT",
    "CRVUSDT", "COMPUSDT", "SNXUSDT", "ZECUSDT", "DASHUSDT",
    "EOSUSDT", "XTZUSDT", "VETUSDT", "THETAUSDT", "FTMUSDT",
    "KSMUSDT", "CHZUSDT", "FLOWUSDT", "GMXUSDT", "DYDXUSDT"
];
const VOLUME_SMA_PERIOD = 20;
// const USER_IDS_FILE = './user_chat_ids.json'; // Not needed anymore for Telegram users

// Removed Telegram Bot token and instance
// const botToken = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
// const bot = new TelegramBot(botToken, { polling: true });

// Active trades now directly stored, not per-user
let activeTrades = {}; // Format: { 'BTCUSDT': { signal, entry, target, stoploss, ... }, ... }
let lastSignalSent = {}; // Tracks last signal sent for each symbol to avoid spamming 'HOLD'

// Removed user-related variables
// let USER_CHAT_IDS = [];
// let userStatus = {};

// --- Socket.IO instance (will be passed from index.js) ---
let io;

// Removed user loading/saving functions
// function loadUserChatIds() { ... }
// function saveUserChatIds() { ... }

async function fetchKlines(symbol, interval, limit = 100) {
    try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const res = await axios.get(url);
        return res.data.map(c => ({
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5]),
            time: c[0]
        }));
    } catch (e) {
        console.error("Kline fetch error for", symbol, e.message);
        return null;
    }
}

async function fetchCurrentPrice(symbol) {
    try {
        const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
        const res = await axios.get(url);
        return parseFloat(res.data.price);
    } catch (e) {
        console.error("Price fetch error for", symbol, e.message);
        return null;
    }
}

function trainMLModel(atrArray, priceArray, targets, stoplosses) {
    const inputs = atrArray.map((atr, i) => [atr, priceArray[i]]);
    const targetMultipliers = targets.map((target, i) => (target - priceArray[i]) / atrArray[i]);
    const stoplossMultipliers = stoplosses.map((sl, i) => Math.abs(sl - priceArray[i]) / atrArray[i]);

    const targetModel = new MLR(inputs, targetMultipliers);
    const stoplossModel = new MLR(inputs, stoplossMultipliers);

    return { targetModel, stoplossModel };
}

function predictMultipliers(atr, price, targetModel, stoplossModel) {
    const input = [atr, price];
    let targetMultiplier = targetModel.predict(input);
    let stoplossMultiplier = stoplossModel.predict(input);

    if (targetMultiplier < 0.5) targetMultiplier = 0.5;
    if (targetMultiplier > 3) targetMultiplier = 3;
    if (stoplossMultiplier < 0.3) stoplossMultiplier = 0.3;
    if (stoplossMultiplier > 2) stoplossMultiplier = 2;

    return { targetMultiplier, stoplossMultiplier };
}

function calculateTargetsML(signal, price, atr, mlModels) {
    let { targetModel, stoplossModel } = mlModels;

    if (!targetModel || !stoplossModel) {
        return calculateTargetsATRBasedFallback(signal, price, atr);
    }

    const { targetMultiplier, stoplossMultiplier } = predictMultipliers(atr, price, targetModel, stoplossModel);

    let target, stoploss;
    if (signal === 'BUY') {
        target = price + targetMultiplier * atr;
        stoploss = price - stoplossMultiplier * atr;
    } else {
        target = price - targetMultiplier * atr;
        stoploss = price + stoplossMultiplier * atr;
    }
    return { target, stoploss };
}

function calculateTargetsATRBasedFallback(signal, price, atr) {
    const atrPercent = (atr / price) * 100;
    let targetMultiplier = 1.5;
    let stoplossMultiplier = 1.0;

    if (atrPercent < 0.5) {
        targetMultiplier = 2.0;
        stoplossMultiplier = 0.7;
    } else if (atrPercent > 2.0) {
        targetMultiplier = 1.2;
        stoplossMultiplier = 1.5;
    }

    let target, stoploss;
    if (signal === 'BUY') {
        target = price + targetMultiplier * atr;
        stoploss = price - stoplossMultiplier * atr;
    } else {
        target = price - targetMultiplier * atr;
        stoploss = price + stoplossMultiplier * atr;
    }
    return { target, stoploss };
}

function analyzeData(candles, mlTrainingData) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    const rsi = RSI.calculate({ values: closes, period: 14 });
    const ema = EMA.calculate({ values: closes, period: 14 });
    const macd = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const volumeSMA = SMA.calculate({ values: volumes, period: VOLUME_SMA_PERIOD });

    const lastClose = closes.at(-1);
    const lastEma = ema.at(-1);
    const lastMacd = macd.at(-1);
    const lastRsi = rsi.at(-1);
    const lastAtr = atr.at(-1);
    const lastVolume = volumes.at(-1);
    const lastVolumeSMA = volumeSMA.at(-1);

    let signal = 'HOLD';
    const volumeOkay = lastVolume > (0.8 * lastVolumeSMA);

    if (volumeOkay && lastClose > lastEma && lastMacd.MACD > lastMacd.signal && lastRsi > 50) {
        signal = 'BUY';
    } else if (volumeOkay && lastClose < lastEma && lastMacd.MACD < lastMacd.signal && lastRsi < 50) {
        signal = 'SELL';
    }

    if (signal !== 'HOLD' && mlTrainingData) {
        const actualTarget = signal === 'BUY' ? lastClose + 1.5 * lastAtr : lastClose - 1.5 * lastAtr;
        const actualStoploss = signal === 'BUY' ? lastClose - 1.0 * lastAtr : lastClose + 1.0 * lastAtr;
        mlTrainingData.atr.push(lastAtr);
        mlTrainingData.price.push(lastClose);
        mlTrainingData.targets.push(actualTarget);
        mlTrainingData.stoplosses.push(actualStoploss);
    }

    return { signal, lastClose, lastRsi, lastEma, lastMacd, lastVolume, lastVolumeSMA, lastAtr };
}

function checkIfHit(price, trade) {
    if (!trade) return false;

    let hitType = false;
    let profitLoss = 0;
    let profitLossPercent = 0;

    if (trade.signal === 'BUY') {
        if (price >= trade.target) {
            hitType = 'target';
            profitLoss = price - trade.entry;
            profitLossPercent = (profitLoss / trade.entry) * 100;
        } else if (price <= trade.stoploss) {
            hitType = 'stoploss';
            profitLoss = price - trade.entry;
            profitLossPercent = (profitLoss / trade.entry) * 100;
        }
    } else { // SELL signal
        if (price <= trade.target) {
            hitType = 'target';
            profitLoss = trade.entry - price;
            profitLossPercent = (profitLoss / trade.entry) * 100;
        } else if (price >= trade.stoploss) {
            hitType = 'stoploss';
            profitLoss = trade.entry - price;
            profitLossPercent = (profitLoss / trade.entry) * 100;
        }
    }

    if (hitType) {
        return {
            type: hitType,
            profitLoss: profitLoss,
            profitLossPercent: profitLossPercent,
            exitPrice: price
        };
    }
    return false;
}

// --- checkSymbol function: Emits to Socket.IO ---
async function checkSymbol(symbol, mlModels, mlTrainingData) {
    const candles = await fetchKlines(symbol, INTERVAL);
    const price = await fetchCurrentPrice(symbol);
    if (!candles || !price) {
        if (io) io.emit('error_message', `Error fetching data for ${symbol}`);
        return;
    }

    const analysis = analyzeData(candles, mlTrainingData);
    if (!analysis) return;

    if (!mlModels.targetModel && mlTrainingData.atr.length >= 30) {
        const models = trainMLModel(mlTrainingData.atr, mlTrainingData.price, mlTrainingData.targets, mlTrainingData.stoplosses);
        mlModels.targetModel = models.targetModel;
        mlModels.stoplossModel = models.stoplossModel;
        console.log("ML Models trained!");
        if (io) io.emit('bot_status', "ML Models trained!");
    }

    console.log(`Analysis for ${symbol} @ ${new Date(candles.at(-1).time).toLocaleString()}: Signal=${analysis.signal}, Price=${price.toFixed(2)}`);

    // Emit live analysis data for current symbol to web
    if (io) {
        io.emit('live_analysis', {
            symbol: symbol,
            signal: analysis.signal,
            currentPrice: price.toFixed(2),
            rsi: analysis.lastRsi.toFixed(2),
            ema: analysis.lastEma.toFixed(2),
            macd: analysis.lastMacd ? analysis.lastMacd.MACD.toFixed(2) : 'N/A',
            macdSignal: analysis.lastMacd ? analysis.lastMacd.signal.toFixed(2) : 'N/A',
            volume: analysis.lastVolume.toFixed(0),
            volumeSMA: analysis.lastVolumeSMA.toFixed(0)
        });
    }

    const trade = activeTrades[symbol]; // Now directly access by symbol

    if (trade && trade.status === 'active') {
        const hitResult = checkIfHit(price, trade);
        if (hitResult) {
            const { type, profitLoss, profitLossPercent, exitPrice } = hitResult;
            const profitLossEmoji = profitLoss >= 0 ? '🟢' : '🔴';
            const tradeDuration = new Date(Date.now() - trade.entryTime).toISOString().slice(11, 19);

            // Emit trade closure to web
            if (io) {
                io.emit('trade_closed', {
                    symbol: symbol,
                    signal: trade.signal,
                    entryPrice: trade.entry.toFixed(2),
                    exitPrice: exitPrice.toFixed(2),
                    outcome: type.toUpperCase(),
                    profitLoss: profitLoss.toFixed(2),
                    profitLossPercent: profitLossPercent.toFixed(2),
                    duration: tradeDuration,
                    emoji: profitLossEmoji
                });
            }

            trade.status = 'closed';
            delete activeTrades[symbol]; // Remove from active trades
            lastSignalSent[symbol] = null;
        }
    } else if (analysis.signal !== 'HOLD' && !activeTrades[symbol]) { // Only if no active trade for this symbol
        const { target, stoploss } = calculateTargetsML(analysis.signal, price, analysis.lastAtr, mlModels);

        // Emit new signal to web
        if (io) {
            io.emit('new_signal', {
                symbol: symbol,
                signal: analysis.signal,
                entry: price.toFixed(2),
                target: target.toFixed(2),
                stoploss: stoploss.toFixed(2),
                rsi: analysis.lastRsi.toFixed(2),
                ema: analysis.lastEma.toFixed(2),
                macd: analysis.lastMacd ? analysis.lastMacd.MACD.toFixed(2) : 'N/A',
                macdSignal: analysis.lastMacd ? analysis.lastMacd.signal.toFixed(2) : 'N/A',
                volume: analysis.lastVolume.toFixed(0),
                volumeSMA: analysis.lastVolumeSMA.toFixed(0)
            });
        }

        activeTrades[symbol] = { // Directly store in activeTrades by symbol
            signal: analysis.signal,
            entry: price,
            target,
            stoploss,
            atr: analysis.lastAtr,
            status: 'active',
            entryTime: Date.now()
        };
        lastSignalSent[symbol] = analysis.signal;
    } else if (analysis.signal === 'HOLD' && lastSignalSent[symbol] !== 'HOLD') {
        if (!activeTrades[symbol]) { // Only if no active trade for this symbol
            if (io) io.emit('hold_signal', { symbol: symbol });
            lastSignalSent[symbol] = 'HOLD';
        }
    }
}

// Removed all Telegram Bot command handlers

// --- Main loop and initialization (now exported) ---
async function mainLoop() {
    const mlTrainingData = { atr: [], price: [], targets: [], stoplosses: [] };
    const mlModels = { targetModel: null, stoplossModel: null };

    while (true) {
        console.log("Starting new analysis cycle...");
        if (io) io.emit('bot_status', 'Starting new analysis cycle...');

        for (const symbol of SYMBOLS) {
            console.log(`Checking symbol: ${symbol}`);
            if (io) io.emit('bot_status', `Checking symbol: ${symbol}`);
            await checkSymbol(symbol, mlModels, mlTrainingData);

            console.log(`Sleeping 1 minute before next symbol...`);
            await new Promise(r => setTimeout(r, 60 * 1000));
        }

        console.log("Cycle done, restarting symbols...");
        if (io) io.emit('bot_status', 'Cycle done, restarting symbols...');
    }
}

// Initialization function to be called from index.js
function initializeBot(socketIoInstance) {
    io = socketIoInstance; // Assign the Socket.IO instance
    // No need to load Telegram user IDs or set user status
    mainLoop(); // Start the main bot logic loop
}

module.exports = {
    initializeBot, // Export initialization function
    activeTrades // Export activeTrades for web display
};