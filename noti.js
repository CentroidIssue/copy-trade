const axios = require('axios');
const secret = require('./config/secret.js');
const TELEGRAM_CHAT_ID = secret.TELEGRAM_CHAT_ID;
const TELEGRAM_BOT_TOKEN = secret.TELEGRAM_BOT_TOKEN;
const MESSENGER_PAGE_ID = secret.MESSENGER_PAGE_ID;
const MESSENGER_PAGE_SECRET = secret.MESSENGER_PAGE_SECRET;

async function telegramBotSendText(text) {
    const pattern = /([\[\]{}()*+?.\\^$|\-\_\!])/g;
    text = text.replace(pattern, '\\$1');

    const params = {
        chat_id: TELEGRAM_CHAT_ID,
        parse_mode: "MarkdownV2",
        text: text
    };

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    try {
        const response = await axios.get(url, { params });
        if (!response.data.ok || response.data.ok === false) {
            const cur = new Date().toLocaleString();
            console.error(cur);
            console.error(response.data);
            console.error('reason:');
            console.error(params);
        }
    } catch (error) {
        const cur = new Date().toLocaleString();
        console.error(cur);
        console.error(error);
        console.error('reason:');
        console.error(params);
    }
}

async function messengerBotSendText(recipientId, text) {
    const messageUrl = `https://graph.facebook.com/v16.0/me/messages?access_token=${MESSENGER_PAGE_SECRET}`;
    
    const data = {
        message: {
            text: text
        },
        recipient: {
            id: recipientId
        },
        messaging_type: "MESSAGE_TAG",
        tag: "ACCOUNT_UPDATE"
    };

    try {
        if (data.recipient && parseInt(data.recipient.id) === parseInt(MESSENGER_PAGE_ID)) {
            return;
        }

        const response = await axios.post(messageUrl, data);

        if ('error' in response.data) {
            const cur = new Date().toLocaleString();
            console.error(cur);
            console.error(response.data.error);
            console.error(response.data.error.message);
            console.error(data);
        }

        return response.data;
    } catch (error) {
        const cur = new Date().toLocaleString();
        console.error(cur);
        console.error(error);
        console.error('reason:');
        console.error(data);
    }
}

// Example usage
// telegramBotSendText('Hello from JavaScript!');
// messengerBotSendText('recipient_id', 'Hello from JavaScript!');
module.exports = {
    telegramBotSendText,
    messengerBotSendText
};