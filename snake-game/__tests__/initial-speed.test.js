const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8')

describe('snake-game 初始速度', () => {
  test('定义 INITIAL_SPEED 常量为 4', () => {
    expect(source).toMatch(/const INITIAL_SPEED = 4\b/)
  })

  test('初始速度使用 INITIAL_SPEED 常量', () => {
    expect(source).toMatch(/let speed = INITIAL_SPEED\b/)
    expect(source).toMatch(/speed = INITIAL_SPEED\b/)
  })

  test('不再存在硬编码 speed = 6', () => {
    expect(source).not.toMatch(/speed = 6\b/)
  })
})
