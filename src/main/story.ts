// Story mode: ask Claude for a short story that uses the learner's words (key from enrich.ts).
// Implementation lives here; registered in main/index.ts as story:generate.
import { ipcMain } from 'electron'
import type { Story, StoryRequest } from '../shared/story'

export async function generateStory(_req: StoryRequest): Promise<Story> {
  throw new Error('Story mode is not implemented yet.')
}

export function registerStoryIpc(): void {
  ipcMain.handle('story:generate', (_e, req: StoryRequest) => generateStory(req))
}
