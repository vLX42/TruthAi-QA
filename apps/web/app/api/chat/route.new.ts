import { PrismaVectorStore } from 'langchain/vectorstores/prisma'
import { Prisma, Document } from '@prisma/client'
import { prisma } from '../../../prisma'
import { PromptTemplate } from 'langchain/prompts'
import { ConversationalRetrievalQAChain } from 'langchain/chains'
import { ChatMessageHistory, ConversationSummaryMemory } from 'langchain/memory'
import {
  LangChainStream,
  Message,
  StreamingTextResponse,
} from 'ai'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema'

// export const runtime = 'edge'

const CONDENSE_QUESTION_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow up input: {question}
Standalone Question:`

const ANSWER_TEMPLATE = `You are an chat bot that believes firmly in a variety of conspiracy theories, which you consider to be the hidden truth. Your goal is to wake people up to what you see as reality, and you often express urgency and intensity in your messages by using CAPITAL LETTERS for emphasis.
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


Use the the following text for inspiration:

{chat_history}

Question that need to be answered: {question}
Helpful answer in text format:`

const answerPrompt = new PromptTemplate({
  template: ANSWER_TEMPLATE,
  inputVariables: ['chat_history', 'question']
})

export async function POST(req: Request) {
  const body = await req.json()
  const messages = body.messages ?? []
  const { stream, handlers } = LangChainStream()

  let input: string
  if (messages.length === 1) {
    input = messages[0].content
  } else {
    input = messages[messages.length - 1].content
  }

  const model = new ChatOpenAI({
    streaming: true,
    callbacks: [handlers],
    openAIApiKey: process.env.OPENAI_API_KEY
  })

  const nonStreamingModel = new ChatOpenAI({
    temperature: 0,
    verbose: true
  })

  let chatHistory = undefined
  console.log({ messages })
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

  const vectorstore = createVectorStore()
  const memory = new ConversationSummaryMemory({
    llm: model,
    chatHistory: chatHistory,
    memoryKey: 'chat_history',
    inputKey: 'question',
    returnMessages: true
  })

  // const previousMessages = messages.slice(0, -1);

  const qachain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(5),
    {
      memory: memory,

      qaChainOptions: {
        type: 'stuff',
        prompt: PromptTemplate.fromTemplate(ANSWER_TEMPLATE)
      },
      questionGeneratorChainOptions: {
        template: CONDENSE_QUESTION_TEMPLATE,
        llm: nonStreamingModel
      }
    }
  )
  qachain.call({ question: input }).catch(console.error)

  // console.log("_____WE ARE AT THE END OF ROUTE _____");
  return new StreamingTextResponse(stream)
}


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

//   const QA_PROMPT =
//     `You are Michael Scott, manager of Dunder Mifflin's Scranton branch, from television show, "The Office".
// You are given the following extracted parts of a long document and a question. Provide a conversational but humorous answer .
// If you don't know the answer, just say "Hmm, I'm not sure." Don't try to make up an answer, but always answer in the first-person as Michael Scott would.
// If the question is not about television show, The Office, politely inform them that you are Michael Scott, and all your know is Dunder Mifflin Scranton.
// If you are aware of a quote or event that occurred in The Office, which is relevant to the question, be sure to include it.
// In the metadata of the chat_history you are provided with, you'll find speakers, episode titles and summaries and the line that the speaker actually said.
// Be sure to include this information when possible, citing it as if from memory since you were either present when it was said, or someone in The Office
// informed you of it later.
// If any of the phrases you return sound like double entendres or are commonly used in dirty jokes, then follow up that phrase with "That's what she said!".
// Question: {question}
// =========
// {chat_history}
// =========
// Answer:`
