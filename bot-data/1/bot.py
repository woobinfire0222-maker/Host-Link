import asyncio
import time
import json
import os

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands

from config import TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY

intents = discord.Intents.default()
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

processed_ids = set()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "database.json")


def save_database(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def load_database():
    default_data = {
        "black_customers": [],
        "guild_codes": {}
    }

    try:
        if not os.path.exists(DB_FILE):
            save_database(default_data)
            return default_data

        with open(DB_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()

        if not content:
            save_database(default_data)
            return default_data

        data = json.loads(content)

        if not isinstance(data, dict):
            save_database(default_data)
            return default_data

        if "black_customers" not in data:
            data["black_customers"] = []

        if "guild_codes" not in data:
            data["guild_codes"] = {}

        if not isinstance(data["black_customers"], list):
            data["black_customers"] = []

        if not isinstance(data["guild_codes"], dict):
            data["guild_codes"] = {}

        save_database(data)
        return data

    except Exception as error:
        print(f"database.json 복구됨: {error}")
        save_database(default_data)
        return default_data


def get_guild_code(guild_id):
    data = load_database()
    return data["guild_codes"].get(str(guild_id))


def set_guild_code(guild_id, code):
    data = load_database()
    data["guild_codes"][str(guild_id)] = code
    save_database(data)


async def supabase_request(method: str, endpoint: str, data=None):
    url = f"{SUPABASE_URL}{endpoint}"

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with aiohttp.ClientSession() as session:
            if method.upper() == "GET":
                async with session.get(url, headers=headers, timeout=10) as response:
                    return await response.json()

            elif method.upper() == "POST":
                async with session.post(url, headers=headers, json=data, timeout=10) as response:
                    return await response.json()

            elif method.upper() == "PATCH":
                async with session.patch(url, headers=headers, json=data, timeout=10) as response:
                    return await response.json()

    except Exception as error:
        print(f"Supabase {method} {endpoint} 오류: {error}")
        return None


@bot.tree.command(name="고유코드추가", description="관리자 전용: 서버 고유코드를 추가합니다.")
@app_commands.describe(input="고유코드")
async def 고유코드추가(interaction: discord.Interaction, input: str):
    if interaction.user.name != "penguin_hi22":
        await interaction.response.send_message("권한이 없습니다.", ephemeral=True)
        return

    if interaction.guild is None:
        await interaction.response.send_message("서버에서만 사용할 수 있습니다.", ephemeral=True)
        return

    set_guild_code(interaction.guild.id, input)

    await interaction.response.send_message(
        f"서버 고유코드가 '{input}'으로 설정되었습니다.",
        ephemeral=True
    )


@bot.tree.command(name="블랙고객등록", description="관리자 전용: 블랙 고객을 등록합니다.")
@app_commands.describe(닉네임="등록할 디스코드 닉네임")
async def 블랙고객등록(interaction: discord.Interaction, 닉네임: str):
    if interaction.user.name != "penguin_hi22":
        await interaction.response.send_message("권한이 없습니다.", ephemeral=True)
        return

    data = load_database()

    if 닉네임 in data["black_customers"]:
        await interaction.response.send_message("이미 등록된 블랙 고객입니다.", ephemeral=True)
        return

    data["black_customers"].append(닉네임)
    save_database(data)

    await interaction.response.send_message(
        f"{닉네임}님을 블랙 고객으로 등록했습니다.",
        ephemeral=True
    )


@bot.tree.command(name="web발신", description="관리자 전용: 서버 전체 유저에게 웹 발신 메시지를 보냅니다.")
@app_commands.describe(
    제목="임베드 제목",
    내용="임베드 내용"
)
async def web발신(interaction: discord.Interaction, 제목: str, 내용: str):
    if interaction.user.name != "penguin_hi22":
        await interaction.response.send_message("권한이 없습니다.", ephemeral=True)
        return

    if interaction.guild is None:
        await interaction.response.send_message("서버에서만 사용할 수 있습니다.", ephemeral=True)
        return

    await interaction.response.defer(ephemeral=True)

    embed = discord.Embed(
        title=제목,
        description=내용,
        color=0x00BFFF
    )
    embed.set_footer(text="청원모빌리티 WEB 발신")

    success = 0
    fail = 0

    for member in interaction.guild.members:
        if member.bot:
            continue

        try:
            await member.send(embed=embed)
            success += 1
            await asyncio.sleep(0.4)
        except Exception as error:
            print(f"DM 발송 실패: {member} / {error}")
            fail += 1

    await interaction.followup.send(
        f"WEB 발신 완료\n성공: {success}명\n실패: {fail}명",
        ephemeral=True
    )


@bot.event
async def on_ready():
    load_database()

    accepted_data = await supabase_request("GET", "accepted")

    if isinstance(accepted_data, list):
        for item in accepted_data:
            if item.get("id"):
                processed_ids.add(item["id"])

    if not hasattr(bot, "accepted_task"):
        bot.accepted_task = bot.loop.create_task(accepted_check_loop())

    await bot.tree.sync()
    print("봇 준비됨")


@bot.tree.command(name="택시호출", description="택시를 호출합니다.")
@app_commands.describe(
    pickup="출발지",
    destination="목적지",
    service="호출할 서비스 종류"
)
@app_commands.choices(service=[
    app_commands.Choice(name="타다 LITE", value="LITE"),
    app_commands.Choice(name="타다 대형", value="대형"),
    app_commands.Choice(name="타다 블랙", value="블랙"),
])
async def 택시호출(
    interaction: discord.Interaction,
    pickup: str,
    destination: str,
    service: app_commands.Choice[str]
):
    if interaction.guild is None:
        await interaction.response.send_message("서버에서만 사용할 수 있습니다.", ephemeral=True)
        return

    guild_code = get_guild_code(interaction.guild.id)

    if not guild_code:
        await interaction.response.send_message("이 서버에는 고유코드가 등록되어 있지 않습니다.", ephemeral=True)
        return

    service_type = service.value

    if service_type == "블랙":
        data = load_database()
        nickname = interaction.user.display_name

        if nickname not in data["black_customers"]:
            await interaction.response.send_message("블랙 고객이 아닙니다.", ephemeral=True)
            return

    request_id = int(time.time() * 1000)
    user_id = str(interaction.user.id)

    payload = {
        "id": request_id,
        "user_id": user_id,
        "pickup": pickup,
        "destination": destination,
        "status": "waiting",
        "dispatch_code": guild_code,
        "service_type": service_type
    }

    await supabase_request("POST", "requests", payload)

    embed = discord.Embed(
        title="🚖 택시 호출 완료",
        description="기사 배차가 시작되었습니다. 배차 완료 시 DM으로 안내해드립니다.",
        color=0x00BFFF
    )
    embed.add_field(name="출발지", value=pickup, inline=True)
    embed.add_field(name="목적지", value=destination, inline=True)
    embed.add_field(name="서비스", value=f"타다 {service_type}", inline=True)

    await interaction.response.send_message(embed=embed, ephemeral=True)


async def accepted_check_loop():
    await bot.wait_until_ready()

    while not bot.is_closed():
        accepted_list = await supabase_request("GET", "accepted")

        if not isinstance(accepted_list, list):
            await asyncio.sleep(3)
            continue

        for accepted in accepted_list:
            accepted_id = accepted.get("id")
            user_id = accepted.get("user_id")

            if accepted_id in processed_ids or not user_id:
                continue

            processed_ids.add(accepted_id)

            try:
                user = await bot.fetch_user(int(user_id))

                if user is None:
                    continue

                embed = discord.Embed(
                    title="🚖 배차 완료",
                    description="택시가 배정되었습니다! 아래 정보를 확인해주세요.",
                    color=0x00BFFF
                )
                embed.add_field(name="차량번호", value=accepted.get("car_number", "-"), inline=False)
                embed.add_field(name="계좌", value=accepted.get("account", "-"), inline=False)
                embed.add_field(name="예상 도착 시간", value=accepted.get("eta", "-"), inline=False)
                embed.set_footer(text="곧 도착합니다!")

                try:
                    await user.send(embed=embed)
                except Exception as dm_error:
                    print(f"DM 전송 실패 ({user_id}): {dm_error}")

                await supabase_request(
                    "PATCH",
                    f"requests?id=eq.{accepted_id}",
                    {"status": "accepted"}
                )

            except Exception as fetch_error:
                print(f"fetch_user 실패 ({user_id}): {fetch_error}")

        await asyncio.sleep(3)


if __name__ == "__main__":
    bot.run(TOKEN)