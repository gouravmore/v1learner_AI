const TelegramBot = require('node-telegram-bot-api');
const Telegram = require('telegraf/telegram')
const https = require('https');
const request = require('request');

const { transcribeAudio } = require('./api');
const fs = require('fs');
require('dotenv').config(); // Load environment variables from .env file

const botToken = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(botToken, { polling: true });
const telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN, [{
    agent: null,
    webhookReply: true
}])

const sentences = [
    { text: 'मैं स्कूल जा रहा हूँ।' },
    { text: 'रात का खाना अच्छा लगा।' },
    { text: 'आज बारिश होने वाली है' },
    { text: 'मैं रविवार को बाजार जा रहा हूँ।', }
];

const practiceSessions = new Map();
function getRandomSentence() {
    const randomIndex = Math.floor(Math.random() * sentences.length);
    return sentences[randomIndex];
}

bot.onText(/\/practice/, (msg) => {
    console.log(msg.from);
    const chatId = msg.chat.id;
    const sentence = getRandomSentence();
  
    practiceSessions.set(chatId, sentence);
  
    bot.sendMessage(chatId, `Practice this sentence:\n\n${sentence.text}`);
    bot.sendMessage(chatId, 'When you are ready to speak, just send an audio message.');
   });

  bot.on('voice', async (voiceMsg) => {
    const chatId = voiceMsg.chat.id;
  
    if (practiceSessions.has(chatId)) {
      const userSentence = practiceSessions.get(chatId);
  
      // Check if the voice message contains audio data
      if (voiceMsg.voice && voiceMsg.voice.file_id) {
        await bot.getFileLink(voiceMsg.voice.file_id).then(async (audioLink) => {

            const response = await transcribeAudio(audioLink);
            console.log(response.status);
            if (response.status == 200) {
              // For now, we'll assume the user got it correct
              const feedback = response.data.output[0]["source"];
              // bot.sendMessage(chatId, `You said: "${userSentence.text}"\n\n${feedback}`);
              saveIndb(voiceMsg, chatId, response.data.output, userSentence.text)
            } else {
              // Handle the case where the request to the AI4Bharat API was not successful
              console.log('AI4Bharat API request error:', response.error);
              // You can handle errors here, e.g., by sending a message to the user
            }
          });
      }
    }
  });
  
  function saveIndb(ctx, chatId, output, original_text){
    let sessionId = ctx.from.id + "_session_" + ctx.date
    request.post(
        `https://telemetry-dev.theall.ai/learner/scores`,
        {
            json: {
                "taskType": "asr",
                "output": output,
                "config": null,
                "user_id": ctx.from.id,
                "session_id": sessionId,
                "date": ctx.date,
                "original_text": original_text,
                "response_text": output[0]["source"]
            },
        },
        function (error, response, body) {
            console.log("DB:", error, response.statusCode);
            if (!error && response.statusCode == 201) {
                showResult(chatId, original_text, output[0]["source"], sessionId);
            } else {
                // Handle the case where the request to the AI4Bharat API was not successful
                console.log('AI4Bharat API request error:', error);
                // You can handle errors here, e.g., by sending a message to the user
            }
        }
    );
};

function showResult(chatId, original_text, returntext, sessionId){
    request.get(
        'https://telemetry-dev.theall.ai/learner/scores/GetGaps/session/'+ sessionId,
        function (error, response, data) {
            if (!error && response.statusCode == 200) {
                compareTranscription(chatId, data, returntext);
            } else {
                // Handle the case where the request to the AI4Bharat API was not successful
                console.log('AI4Bharat API request error:', error);
                // You can handle errors here, e.g., by sending a message to the user
            }
        }
    );
};

function compareTranscription(chatId, data, original_text) {
    data = JSON.parse(data);
    const feedback = [];
    const charactersToImprove = [];

    for (let i = 0; i < data.length; i++) {
        const character = data[i].character;
        const score = data[i].score;

        if (data[i].score >= 0.40 && data[i].character != '' && data[i].score !== 0) {
            feedback.push(`This character "${character}" needs improvement. (Score: ${data[i].score})`);
            charactersToImprove.push(character);
        }

        if(i === data.length-1){
            let responseMessage = '';

            if (feedback.length > 0) {
                responseMessage += feedback.join('\n');
            } else {
                responseMessage += 'Well done! Your pronunciation is excellent.';
            }

            if (charactersToImprove.length > 0) {
                responseMessage += '\n\nCharacters to Improve:\n';
                responseMessage += charactersToImprove.join(', ');
                responseMessage += '\nYou need to practice with variations of these characters.';
            }
            bot.sendMessage(chatId, `You said: "${original_text}"\n\n${responseMessage}`);
            practiceSessions.delete(chatId);
        }
    }

    //return responseMessage;
}

// Listen for the /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to Bee The Bot! To start practicing, use the /practice command.');
});

// Listen for messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Implement your language learning logic here and respond accordingly.
  // You can use if statements or a more sophisticated command handling system.

  // Example response:
  if (text === '/hi') {
    bot.sendMessage(chatId, 'Welcome to Bee The Bot! To start practicing, use the /practice command.');
  }
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error(error);
});
