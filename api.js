const axios = require('axios');
const fs = require('fs');
require('dotenv').config(); // Load environment variables from .env file

const apiKey = process.env.AI4BHARAT_API_KEY;
const apiUrl = 'https://demo-api.models.ai4bharat.org/inference/asr/whisper';

// Function to send an audio file to the AI4Bharat API and transcribe it
async function transcribeAudio(audioFilePath) {
  try {
    const requestBody = {
      config: {
        language: {
          sourceLanguage: 'en', // Adjust the source language as needed
        },
        transcriptionFormat: {
          value: 'transcript',
        },
        bestTokenCount: 2
      },
      audio: [{
        audioUri: audioFilePath,
      }],
    };
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json', // Adjust content type as needed
        'Authorization': `${apiKey}`,
      },
    });

    return response;
  } catch (error) {
    console.error('Error from AI4Bharat api:', error);
    throw error;
  }
}

module.exports = { transcribeAudio };
