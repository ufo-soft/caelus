import Counter from '#models/counter'

/** The one counter row. Every handler goes through here. */
export default class CounterService {
  async current(): Promise<number> {
    return (await this.row()).value
  }

  async adjust(by: number): Promise<number> {
    await this.row()
    // one statement, so two concurrent adjustments can't both save the same read value
    await Counter.query().where('id', 1).increment('value', by)
    return this.current()
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
