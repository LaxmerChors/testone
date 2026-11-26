/* 贪吃蛇 - 单文件游戏逻辑，使用 Canvas */
'use strict'

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

const GRID = 20 // 网格大小（像素）
const COLS = canvas.width / GRID
const ROWS = canvas.height / GRID

// 游戏状态
let snake = [{x: Math.floor(COLS/2), y: Math.floor(ROWS/2)}]
let dir = {x: 1, y: 0}
let nextDir = null
let food = {}
let score = 0
const INITIAL_SPEED = 4 // 初始速度：帧每秒
let speed = INITIAL_SPEED
let running = false
let paused = false
let tickInterval = null

const scoreEl = document.getElementById('score')
const speedEl = document.getElementById('speed')
const startBtn = document.getElementById('startBtn')
const pauseBtn = document.getElementById('pauseBtn')
const securityTestBtn = document.getElementById('securityTestBtn')

function placeFood(){
  while(true){
    const x = Math.floor(Math.random() * COLS)
    const y = Math.floor(Math.random() * ROWS)
    if(!snake.some(s => s.x === x && s.y === y)){
      food = {x,y}
      return
    }
  }
}

function reset(){
  snake = [{x: Math.floor(COLS/2), y: Math.floor(ROWS/2)}]
  dir = {x: 1, y: 0}
  nextDir = null
  score = 0
  speed = INITIAL_SPEED
  running = true
  paused = false
  placeFood()
  updateUI()
  startLoop()
}

function updateUI(){
  // 添加日志验证 XSS 漏洞假设
  console.log('🔍 [DEBUG] updateUI 被调用:', { score, speed, paused })
  console.log('🔍 [DEBUG] 设置前 scoreEl.textContent:', scoreEl.textContent)
  console.log('🔍 [DEBUG] 设置前 speedEl.textContent:', speedEl.textContent)
  
  scoreEl.textContent = String(score)
  speedEl.textContent = String(speed)
  
  console.log('🔍 [DEBUG] 设置后 scoreEl.textContent:', scoreEl.textContent)
  console.log('🔍 [DEBUG] 设置后 speedEl.textContent:', speedEl.textContent)
  console.log('🔍 [DEBUG] 检查 innerHTML 是否被修改:',
    scoreEl.innerHTML !== scoreEl.textContent || speedEl.innerHTML !== speedEl.textContent)
  
  pauseBtn.textContent = paused ? '继续' : '暂停'
}

function drawCell(x, y, color){
  ctx.fillStyle = color
  ctx.fillRect(x*GRID+1, y*GRID+1, GRID-2, GRID-2)
}

function draw(){
  // 背景
  ctx.clearRect(0,0,canvas.width,canvas.height)

  // 食物
  drawCell(food.x, food.y, '#ff5252')

  // 蛇
  for(let i=0;i<snake.length;i++){
    const s = snake[i]
    const hue = 120 - Math.min(90, i * (90 / snake.length))
    drawCell(s.x, s.y, `hsl(${hue}deg 80% 40%)`)
  }
}

function move(){
  if(nextDir){
    // 防止反向
    if(!(nextDir.x === -dir.x && nextDir.y === -dir.y)){
      dir = nextDir
    }
    nextDir = null
  }

  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y}

  // 边界穿越（可修改为碰撞死亡）
  if(head.x < 0) head.x = COLS - 1
  if(head.x >= COLS) head.x = 0
  if(head.y < 0) head.y = ROWS - 1
  if(head.y >= ROWS) head.y = 0

  // 自己碰撞 -> 游戏结束
  if(snake.some(s => s.x === head.x && s.y === head.y)){
    stopGame()
    return
  }

  snake.unshift(head)

  // 吃到食物
  if(head.x === food.x && head.y === food.y){
    score += 10
    // 每隔若干分数提升速度
    if(score % 50 === 0) speed = Math.min(18, speed + 1)
    placeFood()
    updateUI()
  } else {
    snake.pop()
  }
}

function gameTick(){
  if(!running || paused) return
  move()
  draw()
}

function startLoop(){
  stopLoop()
  const stepMs = Math.round(1000 / speed)
  tickInterval = setInterval(gameTick, stepMs)
}

function stopLoop(){
  if(tickInterval) clearInterval(tickInterval)
  tickInterval = null
}

function stopGame(){
  running = false
  stopLoop()
  // 轻提示
  setTimeout(()=>{
    if(confirm(`游戏结束！得分 ${score}. 重新开始？`)) reset()
  }, 50)
}

// 控制输入
window.addEventListener('keydown', (e) => {
  const k = e.key
  if(k === 'ArrowUp' || k === 'w' || k === 'W') nextDir = {x:0,y:-1}
  if(k === 'ArrowDown' || k === 's' || k === 'S') nextDir = {x:0,y:1}
  if(k === 'ArrowLeft' || k === 'a' || k === 'A') nextDir = {x:-1,y:0}
  if(k === 'ArrowRight' || k === 'd' || k === 'D') nextDir = {x:1,y:0}

  if(k === ' '){ // 空格 暂停/继续
    paused = !paused
    updateUI()
  }
})

// 点击按钮
startBtn.addEventListener('click', () => reset())
pauseBtn.addEventListener('click', () => { paused = !paused; updateUI() })

// 触摸/移动事件（移动设备的简易支持）
let touchStart = null
canvas.addEventListener('touchstart', (e) => { if(e.touches.length === 1) touchStart = {x:e.touches[0].clientX, y:e.touches[0].clientY} })
canvas.addEventListener('touchend', (e) => {
  if(!touchStart) return
  const dx = e.changedTouches[0].clientX - touchStart.x
  const dy = e.changedTouches[0].clientY - touchStart.y
  const absx = Math.abs(dx), absy = Math.abs(dy)
  if(Math.max(absx, absy) < 20) return
  if(absx > absy){ nextDir = {x: dx>0 ? 1 : -1, y:0} } else { nextDir = {x:0,y: dy>0 ? 1 : -1} }
  touchStart = null
})

// 安全测试功能
securityTestBtn.addEventListener('click', async () => {
  try {
    // 显示加载状态
    securityTestBtn.textContent = '🔒 测试中...'
    securityTestBtn.disabled = true
    
    // 动态加载安全测试模块
    if (!window.SecurityTester) {
      const script = document.createElement('script')
      script.src = 'security-test.js'
      script.onload = () => {
        runSecurityTests()
      }
      script.onerror = () => {
        alert('安全测试模块加载失败！')
        securityTestBtn.textContent = '?? 安全测试'
        securityTestBtn.disabled = false
      }
      document.head.appendChild(script)
    } else {
      runSecurityTests()
    }
  } catch (error) {
    console.error('安全测试错误:', error)
    alert('安全测试执行失败！')
    securityTestBtn.textContent = '🔒 安全测试'
    securityTestBtn.disabled = false
  }
})

function runSecurityTests() {
  try {
    // 创建游戏实例引用
    const gameInstance = {
      score: score,
      speed: speed,
      nextDir: nextDir,
      reset: reset,
      stopGame: stopGame,
      running: running,
      paused: paused
    }
    
    // 运行安全测试
    const tester = new SecurityTester(gameInstance)
    const report = tester.runAllTests()
    
    // 显示报告
    tester.displayReport(report)
    
    // 恢复按钮状态
    securityTestBtn.textContent = '🔒 安全测试'
    securityTestBtn.disabled = false
    
  } catch (error) {
    console.error('安全测试执行错误:', error)
    alert('安全测试执行失败: ' + error.message)
    securityTestBtn.textContent = '🔒 安全测试'
    securityTestBtn.disabled = false
  }
}

// 初始化
placeFood()
updateUI()
draw()