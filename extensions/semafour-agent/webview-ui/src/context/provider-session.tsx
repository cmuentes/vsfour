import type { ParentComponent } from "solid-js"
import { IndexingProvider } from "./indexing"
import { KiloEmbeddingModelsProvider } from "./kilo-embedding-models"
import { ImageModelsProvider } from "./image-models"
import { SpeechToTextModelsProvider } from "./speech-to-text-models"
import { SessionProvider } from "./session"

export const Session: ParentComponent = (props) => (
  <IndexingProvider>
    <KiloEmbeddingModelsProvider>
      <ImageModelsProvider>
        <SpeechToTextModelsProvider>
          <SessionProvider>{props.children}</SessionProvider>
        </SpeechToTextModelsProvider>
      </ImageModelsProvider>
    </KiloEmbeddingModelsProvider>
  </IndexingProvider>
)
