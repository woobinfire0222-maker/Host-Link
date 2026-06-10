import discord
from discord.ext import commands
import os

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'✅ {bot.user} 봇이 온라인입니다!')

@bot.command()
async def ping(ctx):
    await ctx.send(f'🏓 Pong! 지연: {round(bot.latency * 1000)}ms')

@bot.command()
async def hello(ctx):
    await ctx.send(f'안녕하세요, {ctx.author.mention}!')

# 봇 토큰을 환경변수나 아래에 직접 입력하세요
bot.run(os.environ.get('DISCORD_TOKEN', 'YOUR_BOT_TOKEN_HERE'))
