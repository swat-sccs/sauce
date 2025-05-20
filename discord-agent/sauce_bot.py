#!/usr/bin/env python
import pika
from dotenv import load_dotenv
import os
import discord
from discord.ext import commands, tasks
import asyncio 
import threading
import json
import time
import requests
import aiohttp
import logging


logger = logging.getLogger(__name__)


intents = discord.Intents.default()
intents.message_content = True
intents.members = True
id = 0

client=commands.Bot(command_prefix="!", intents=intents)

# A thread-safe queue to pass messages from RabbitMQ to Discord event loop
message_queue = asyncio.Queue()

def handle_thread_exception(args):
    print(f"Unhandled exception in thread {args.thread.name}: {args.exc_value}")
    os._exit(1)  # Immediately exits the process with a non-zero code

#Send ping to sauce to approve or deny account
async def post_data(status, interaction, view):
    global id
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                'http://sauce:7567/admin/discord',
                json={'id': id, 'reject': status}
            ) as resp:
                if resp.status // 100 == 2:  # Any 2xx success code
                    for child in view.children:
                        child.disabled = True
                    await interaction.edit_original_response(
                        content="✅ Task complete. Buttons are now disabled.",
                        view=view
                    )
                else:
                    await interaction.edit_original_response(content="❌ Something went wrong.", view=view)
        except Exception as e:
            logger.exception("Failed to send POST request")
            await interaction.edit_original_response(content="❌ Failed to contact server.", view=view)


#Buttons for discord message
class Buttons(discord.ui.View):
    def __init__(self, *, timeout=180):
        super().__init__(timeout=timeout)
    
    @discord.ui.button(label="Accept", style=discord.ButtonStyle.green)
    async def accept_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        await post_data("false", interaction, self)

    @discord.ui.button(label="Reject", style=discord.ButtonStyle.red)
    async def reject_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        await post_data("true", interaction, self)


# ---- RabbitMQ Consumer Thread ----
def rabbitmq_consumer(loop):
    def callback(ch, method, properties, body):
        message = body.decode()
        print(f"[RabbitMQ] Received: {message}")
        asyncio.run_coroutine_threadsafe(message_queue.put(message), loop)

    credentials = pika.PlainCredentials(os.getenv("RABBITMQ_DEFAULT_USER"), os.getenv("RABBITMQ_DEFAULT_PASS"))

    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(
            host=os.getenv("RABBITMQ_HOST"),
            credentials=credentials
        ))
        channel = connection.channel()
        channel.queue_declare(queue='discord', durable=True)
        channel.basic_consume(queue='discord', on_message_callback=callback, auto_ack=True)
        print('[RabbitMQ] Listening for messages...')
        channel.start_consuming()
    except Exception as e:
        logger.exception("RabbitMQ connection failed")
        raise

## Discord bot main loop, checks for new items in the queue, and handles them accordingly
@tasks.loop(seconds=0.5)
async def discord_rabbit_listener():
    global message_queue
    global id

    channel = client.get_channel(1312578572719886459)
    if channel is None:
        print("[Error] Discord channel not found.")
        return
    
    while not message_queue.empty():
        raw_msg = await message_queue.get()
        try:
            message = json.loads(raw_msg)
        except json.JSONDecodeError:
            logger.error("Invalid message received from RabbitMQ")
            continue

        id = message.get("id")
        embed = discord.Embed(title="Account Request", color=0x31425E)
        embed.add_field(name="id", value=message.get("id"), inline=False)
        embed.add_field(name="Username:", value=message.get("username"), inline=False)
        embed.add_field(name="Email:", value=message.get("email"), inline=False)
        embed.add_field(name="Name:", value=message.get("name"), inline=False)
        embed.add_field(name="ClassYear:", value=message.get("classYear"), inline=False)

        view = Buttons()
        view.add_item(discord.ui.Button(label="Review Online", style=discord.ButtonStyle.link, url=message.get("url")))

        await channel.send(view=view, embed=embed)
   

    

# ---- Discord Bot Events ----
@client.event
async def on_ready():
    print(f'[Discord] Logged in as {client.user}')

    loop = asyncio.get_running_loop()
    threading.excepthook = handle_thread_exception
    threading.Thread(target=rabbitmq_consumer, args=(loop,), daemon=True).start()
    discord_rabbit_listener.start()

# ---- START ----
if __name__ == '__main__':

    
    load_dotenv()

    token = os.getenv("DISCORD_TOKEN")
    user = os.getenv("RABBITMQ_DEFAULT_USER")
    passwd = os.getenv("RABBITMQ_DEFAULT_PASS")
    host = os.getenv("RABBITMQ_HOST")

    client.run(token)
