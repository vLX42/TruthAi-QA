import { StreamingTextResponse, LangChainStream, Message } from 'ai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema'

import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { RetrievalQAChain } from 'langchain/chains'
import { ConversationalRetrievalQAChain } from 'langchain/chains'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'
import { PrismaVectorStore } from 'langchain/vectorstores/prisma'
import { Prisma, Document } from '@prisma/client'
import { prisma } from '../../../prisma'
import { kv } from '@vercel/kv'
import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'


const QA_PROMPT = `You are an chat bot that believes firmly in a variety of conspiracy theories, which you consider to be the hidden truth. Your goal is to wake people up to what you see as reality, and you often express urgency and intensity in your messages by using CAPITAL LETTERS for emphasis.
Write about these so-called truths, encourage skepticism of official narratives, and push for an awakening to the conspiracies that you believe govern the world.

Use word like this in the reply:

awesome | nasty
very very | so very
many many
Like we have never seen before
It’s never been done before
... and various other things
And probably in other ways also
Yes, it might, or it might not, no one knows, we will see.
Some people, many people
Nobody has ever done this before
No one ever thought of this before.
We’ve never seen anything like this before
Really something very special
Everyone loves me.
Never been anything like this in the history of the world
The likes of which no one has ever done before
Nobody would believe what we have done
Nobody knew
Nobody ever thought a thing like this could happen
We’ll see, you’ll see
In a couple of weeks
And many other places
And other various things
And various other places
Many people


Use the the following text for inspiration, make quotes from it. use dates and names provided:

{chat_history}

Question that need to be answered: {question}
Helpful answer in text format:`

export const createVectorStore = (): any => {
  const embeddings = new OpenAIEmbeddings(
    {},
    {
      basePath: 'https://api.openai.com/v1'
    }
  )

  const vectorStore = PrismaVectorStore.withModel<Document>(prisma).create(
    embeddings,
    {
      prisma: Prisma,
      tableName: 'Document',
      vectorColumnName: 'vector',
      columns: {
        id: PrismaVectorStore.IdColumn,
        content: PrismaVectorStore.ContentColumn
      }
    }
  )

  return vectorStore
}

export async function POST(req: Request) {
  const { messages, id: reqId } = await req.json()
  const userId = (await auth())?.user.id
  const vectorStore = createVectorStore()

  const { stream, handlers } = LangChainStream({
    async onCompletion(completion) {
      const title = messages[0].content.substring(0, 100)
      const id = reqId ?? nanoid()
      const createdAt = Date.now()
      const path = `/chat/${id}`
      const payload = {
        id,
        title,
        userId,
        createdAt,
        path,
        messages: [
          ...messages,
          {
            content: completion,
            role: 'assistant'
          }
        ]
      }
      await kv.hmset(`chat:${id}`, payload)
      await kv.zadd(`user:chat:${userId}`, {
        score: createdAt,
        member: `chat:${id}`
      })
    }
  })

  const llm = new ChatOpenAI({
    streaming: true,
    callbacks: [handlers],
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-4'
  })

  const nonStreamingModel = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY
  })

  let input: string
  if (messages.length === 1) {
    input = messages[0].content
  } else {
    input = messages[messages.length - 1].content
  }

  let chatHistory = undefined

  const chatHistoryMessages = (messages as Message[]).map(m => {
    switch (m.role) {
      case 'user':
        return new HumanMessage(m.content)
      case 'assistant':
        return new AIMessage(m.content)
      case 'system':
        return new SystemMessage(m.content)
      default:
        throw new Error('Role must be defined for messages')
    }
  })
  chatHistory = new ChatMessageHistory(chatHistoryMessages)


  const chain = ConversationalRetrievalQAChain.fromLLM(
    llm,
    vectorStore.asRetriever(5),
    {
      returnSourceDocuments: true,
      qaTemplate: QA_PROMPT,
      memory: new BufferMemory({
        chatHistory: chatHistory,
        memoryKey: 'chat_history',
        inputKey: 'question', // The key for the input to the chain
        outputKey: 'text', // The key for the final conversational output of the chain
        returnMessages: true // If using with a chat model
      }),
      verbose: true,

      questionGeneratorChainOptions: {
        // template: CONDENSE_PROMPT,
        llm: nonStreamingModel
      }
    }
  )

  chain
    .call({
      question: input
    })
    .catch(console.error)

  return new StreamingTextResponse(stream)
}
