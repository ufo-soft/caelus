import Counter from '#models/counter'

/** The one counter row. Every REST handler and, later, every registry handler goes through here. */
export default class CounterService {
  async current(): Promise<number> {
    return (await this.row()).value
  }

  async adjust(by: number): Promise<number> {
    const row = await this.row()
    row.value += by
    await row.save()
    return row.value
  }

  async reset(): Promise<number> {
    const row = await this.row()
    row.value = 0
    await row.save()
    return row.value
  }

  private row(): Promise<Counter> {
    return Counter.firstOrCreate({ id: 1 }, { value: 0 })
  }
}
