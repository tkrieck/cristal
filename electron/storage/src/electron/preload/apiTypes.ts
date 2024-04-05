import { PageData } from "@cristal/api";

export interface APITypes {
  resolvePath(page: string, syntax: string): Promise<string>;

  readPage(path: string): Promise<PageData>;
}
