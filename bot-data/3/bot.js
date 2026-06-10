const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} 봇이 온라인입니다!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    await message.reply(`🏓 Pong! 지연: ${Math.round(client.ws.ping)}ms`);
  }
  if (message.content === '!hello') {
    await message.reply(`안녕하세요, ${message.author}!`);
  }
});

// 봇 토큰을 환경변수나 아래에 직접 입력하세요
client.login(process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE');
