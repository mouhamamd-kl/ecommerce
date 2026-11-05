export class ProductPhoto {
  constructor(
    public readonly id: number | null,
    public readonly url: string,
    public readonly isPrimary: boolean,
    public readonly sortOrder: number,
  ) {
    if (!url.trim()) {
      throw new Error('Photo URL cannot be empty');
    }

    if (sortOrder < 0) {
      throw new Error('Photo sort order cannot be negative');
    }
  }
}