export default class Downloader {
  protected downloads: any

  constructor() {
    this.downloads = {}
  }

  async init() {}
  add(key: string) {
    this.downloads[key] = {
      key,
    }
  }
}
