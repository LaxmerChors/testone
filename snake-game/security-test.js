/* 贪吃蛇游戏 - 安全漏洞测试模块 */
'use strict'

class SecurityTester {
  constructor(gameInstance) {
    this.game = gameInstance
    this.testResults = []
    this.vulnerabilities = []
  }
  // 测试1: XSS漏洞测试
  testXSSVulnerability() {
    console.log('🔍 测试XSS漏洞...')
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      '\'; alert(\'XSS\'); //'
    ]

    let xssFound = false
    const scoreEl = document.getElementById('score')
    const speedEl = document.getElementById('speed')
    if (!scoreEl || !speedEl) {
      console.warn('XSS测试跳过：缺少所需DOM元素')
      this.testResults.push({
        test: 'XSS漏洞测试',
        status: 'SKIP',
        details: '缺少所需DOM元素'
      })
      return
    }

    // 保存原始状态快照
    const originalScore = scoreEl.textContent
    const originalSpeed = speedEl.textContent

    maliciousInputs.forEach(input => {
      try {
        const escapedInput = input.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        scoreEl.textContent = input
        speedEl.textContent = input

        // 检查是否进行了正确的HTML转义
        if (scoreEl.textContent !== escapedInput || speedEl.textContent !== escapedInput) {
          xssFound = true
          this.vulnerabilities.push({
            type: 'XSS',
            severity: 'HIGH',
            description: `输入 "${input}" 未被正确转义`,
            location: '分数/速度显示元素'
          })
        }
        
        // 测试如果直接设置innerHTML是否会执行脚本
        const originalHTML = scoreEl.innerHTML
        scoreEl.innerHTML = input
        if (scoreEl.innerHTML !== originalHTML && scoreEl.innerHTML.includes('<script>')) {
          xssFound = true
          this.vulnerabilities.push({
            type: 'XSS',
            severity: 'HIGH',
            description: `HTML注入漏洞: "${input}" 被执行`,
            location: '分数/速度显示元素的innerHTML处理'
          })
        }
      } catch (e) {
        console.error('XSS测试错误:', e.message)
      } finally {
        // 确保恢复
        scoreEl.textContent = originalScore
        speedEl.textContent = originalSpeed
      }
    })

    this.testResults.push({
      test: 'XSS漏洞测试',
      status: xssFound ? 'VULNERABLE' : 'SECURE',
      details: xssFound ? '发现XSS漏洞' : '未发现XSS漏洞'
    })
  }

  // 测试2: 输入验证测试
  testInputValidation() {
    console.log('🔍 测试输入验证...')
    const invalidInputs = [
      { key: 'ArrowUp', code: 38, repeat: 1000 },
      { key: null, code: null },
      { key: undefined, code: undefined },
      { key: 12345, code: 'invalid' },
      { key: '<script>alert(1)</script>', code: 999 }
    ]

    let validationIssues = false

    invalidInputs.forEach(input => {
      try {
        // 保存游戏状态用于比较
        const originalDir = this.game.nextDir ? { ...this.game.nextDir } : null
        
        // 模拟键盘事件
        const event = new KeyboardEvent('keydown', {
          key: input.key,
          code: input.code,
          repeat: input.repeat,
          bubbles: true,
          cancelable: true
        })
        
        // 触发事件
        window.dispatchEvent(event)
        
        // 异步检查游戏状态，避免同步阻塞
        setTimeout(() => {
          // 检查游戏状态是否异常
          if (this.game.nextDir && 
              (typeof this.game.nextDir.x !== 'number' || 
               typeof this.game.nextDir.y !== 'number')) {
            validationIssues = true
            this.vulnerabilities.push({
              type: 'INPUT_VALIDATION',
              severity: 'MEDIUM',
              description: `无效输入 "${JSON.stringify(input)}" 导致异常状态`,
              location: '键盘事件处理'
            })
          }
          
          // 恢复原始状态
          if (originalDir) {
            this.game.nextDir = { ...originalDir }
          }
        }, 0)

      } catch (e) {
        validationIssues = true
        this.vulnerabilities.push({
          type: 'INPUT_VALIDATION',
          severity: 'MEDIUM',
          description: `输入验证错误: ${e.message}`,
          location: '键盘事件处理'
        })
      }
    })

    this.testResults.push({
      test: '输入验证测试',
      status: validationIssues ? 'VULNERABLE' : 'SECURE',
      details: validationIssues ? '发现输入验证问题' : '输入验证正常'
    })
  }

  // 测试3: 内存泄漏测试
  async testMemoryLeak() {
    console.log('🔍 测试内存泄漏...')
    let memoryLeaks = false
    if (!performance.memory) {
      console.warn('内存泄漏测试跳过：当前环境不支持 performance.memory')
      this.testResults.push({
        test: '内存泄漏测试',
        status: 'SKIP',
        details: '环境不支持内存监控'
      })
      return
    }

    // 采样基线
    const samples = []
    const collectSample = async () => {
      for (let i = 0; i < 3; i++) {
        if (window.gc) window.gc()
        samples.push(performance.memory.usedJSHeapSize)
        // 异步等待GC完成
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return samples.sort((a, b) => a - b)[1] // 取中位数
    }

    const baseline = await collectSample()

    try {
      // 快速启动和停止游戏多次
      for (let i = 0; i < 100; i++) {
        this.game.reset()
        this.game.stopGame()
      }

      if (window.gc) window.gc()

      const endSamples = []
      for (let i = 0; i < 3; i++) {
        endSamples.push(performance.memory.usedJSHeapSize)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      const final = endSamples.sort((a, b) => a - b)[1]

      const increase = final - baseline
      if (increase > 10 * 1024 * 1024) { // 10MB阈值
        memoryLeaks = true
        this.vulnerabilities.push({
          type: 'MEMORY_LEAK',
          severity: 'MEDIUM',
          description: `检测到内存泄漏: ${Math.round(increase / 1024 / 1024)}MB`,
          location: '游戏循环和重置功能'
        })
      }
    } catch (e) {
      memoryLeaks = true
      this.vulnerabilities.push({
        type: 'MEMORY_LEAK',
        severity: 'MEDIUM',
        description: `内存泄漏测试错误: ${e.message}`,
        location: '内存监控'
      })
    }

    this.testResults.push({
      test: '内存泄漏测试',
      status: memoryLeaks ? 'VULNERABLE' : 'SECURE',
      details: memoryLeaks ? '发现内存泄漏' : '未发现内存泄漏'
    })
  }

  // 测试4: 游戏状态篡改测试
  testGameStateTampering() {
    console.log('🔍 测试游戏状态篡改...')
    let tamperingIssues = false

    try {
      // 深拷贝保存完整状态
      const snapshot = this.captureGameSnapshot()

      // 尝试篡改
      this.game.score = 999999
      this.game.speed = 100

      if (this.game.score === 999999 || this.game.speed === 100) {
        tamperingIssues = true
        this.vulnerabilities.push({
          type: 'STATE_TAMPERING',
          severity: 'HIGH',
          description: '游戏状态可以被外部直接修改',
          location: '游戏状态管理'
        })
      }

      // 原子性还原
      this.restoreGameSnapshot(snapshot)

    } catch (e) {
      tamperingIssues = true
      this.vulnerabilities.push({
        type: 'STATE_TAMPERING',
        severity: 'HIGH',
        description: `状态篡改测试错误: ${e.message}`,
        location: '游戏状态管理'
      })
    }

    this.testResults.push({
      test: '游戏状态篡改测试',
      status: tamperingIssues ? 'VULNERABLE' : 'SECURE',
      details: tamperingIssues ? '发现状态篡改漏洞' : '状态保护正常'
    })
  }

  // 快照辅助方法
  captureGameSnapshot() {
    // 仅示例：按需扩展需要保护的字段
    return {
      score: this.game.score,
      speed: this.game.speed,
      // 若存在更多派生状态，可继续追加
    }
  }

  restoreGameSnapshot(snapshot) {
    this.game.score = snapshot.score
    this.game.speed = snapshot.speed
  }

  // 测试5: DoS攻击测试
  testDoSAttack() {
    console.log('🔍 测试DoS攻击...')
    let dosVulnerable = false

    try {
      // 快速发送大量事件
      const startTime = Date.now()
      
      for (let i = 0; i < 10000; i++) {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
        window.dispatchEvent(event)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      if (duration > 5000) { // 超过5秒认为存在DoS风险
        dosVulnerable = true
        this.vulnerabilities.push({
          type: 'DOS_ATTACK',
          severity: 'LOW',
          description: `事件处理可能存在DoS风险: ${duration}ms`,
          location: '事件监听器'
        })
      }

    } catch (e) {
      dosVulnerable = true
      this.vulnerabilities.push({
        type: 'DOS_ATTACK',
        severity: 'LOW',
        description: `DoS测试错误: ${e.message}`,
        location: '事件处理'
      })
    }

    this.testResults.push({
      test: 'DoS攻击测试',
      status: dosVulnerable ? 'VULNERABLE' : 'SECURE',
      details: dosVulnerable ? '存在DoS攻击风险' : 'DoS防护正常'
    })
  }

  // 测试6: 跨域请求测试
  async testCORSIssues() {
    console.log('🔍 测试跨域问题...')
    let corsIssues = false
    
    // 测试外部恶意脚本加载
    const maliciousUrls = [
      `${window.location.origin}/mock-external.js`,
      'https://malicious.example.com/script.js'
    ]

    try {
      for (const url of maliciousUrls) {
        try {
          // 使用fetch测试跨域请求限制
          const response = await fetch(url, { 
            method: 'HEAD',
            mode: 'cors'
          })
          
          // 如果请求成功，可能存在CORS配置问题
          if (response.ok) {
            corsIssues = true
            this.vulnerabilities.push({
              type: 'CORS',
              severity: 'MEDIUM',
              description: `外部资源可被访问: ${url}`,
              location: '跨域请求策略'
            })
          }
        } catch (fetchError) {
          // fetch失败是预期的，说明CORS策略正常工作
          console.log(`CORS策略阻止了对 ${url} 的访问`)
        }

        // 测试脚本注入
        const scriptLoaded = await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = url
          script.onload = () => {
            document.head.removeChild(script)
            resolve(true) // 脚本加载成功，存在安全风险
          }
          script.onerror = () => {
            document.head.removeChild(script)
            resolve(false) // 脚本加载失败，安全
          }
          // 设置超时
          setTimeout(() => {
            if (script.parentNode) {
              document.head.removeChild(script)
            }
            resolve(false)
          }, 2000)
          
          // 添加到DOM触发加载
          document.head.appendChild(script)
        })

        if (scriptLoaded) {
          corsIssues = true
          this.vulnerabilities.push({
            type: 'CORS',
            severity: 'HIGH',
            description: `成功加载外部脚本: ${url}`,
            location: '脚本注入防护'
          })
        }
      }
    } catch (e) {
      corsIssues = true
      this.vulnerabilities.push({
        type: 'CORS',
        severity: 'MEDIUM',
        description: `CORS测试错误: ${e.message}`,
        location: '跨域请求'
      })
    }

    this.testResults.push({
      test: '跨域请求测试',
      status: corsIssues ? 'VULNERABLE' : 'SECURE',
      details: corsIssues ? '存在CORS问题' : 'CORS配置安全'
    })
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始安全漏洞测试...')
    this.testResults = []
    this.vulnerabilities = []

    this.testXSSVulnerability()
    this.testInputValidation()
    await this.testMemoryLeak()
    this.testGameStateTampering()
    this.testDoSAttack()
    await this.testCORSIssues()

    return this.generateReport()
  }

  // 生成测试报告
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      vulnerableTests: this.testResults.filter(t => t.status === 'VULNERABLE').length,
      secureTests: this.testResults.filter(t => t.status === 'SECURE').length,
      testResults: this.testResults,
      vulnerabilities: this.vulnerabilities,
      riskLevel: this.calculateRiskLevel()
    }

    return report
  }

  // 计算风险等级
  calculateRiskLevel() {
    if (this.vulnerabilities.some(v => v.severity === 'HIGH')) {
      return 'HIGH'
    } else if (this.vulnerabilities.some(v => v.severity === 'MEDIUM')) {
      return 'MEDIUM'
    } else if (this.vulnerabilities.length > 0) {
      return 'LOW'
    } else {
      return 'SECURE'
    }
  }

  // 显示测试报告
  displayReport(report) {
    const reportHtml = `
      <div id="security-report" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #333;
        border-radius: 10px;
        padding: 20px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 1000;
      ">
        <h2 style="margin-top: 0; color: ${this.getRiskColor(report.riskLevel)};">
          🔒 安全测试报告
        </h2>
        <div style="margin-bottom: 15px;">
          <strong>测试时间:</strong> ${new Date(report.timestamp).toLocaleString()}
        </div>
        <div style="margin-bottom: 15px;">
          <strong>风险等级:</strong> 
          <span style="color: ${this.getRiskColor(report.riskLevel)}; font-weight: bold;">
            ${report.riskLevel}
          </span>
        </div>
        <div style="margin-bottom: 15px;">
          <strong>测试结果:</strong> 
          ${report.secureTests}项安全 / ${report.vulnerableTests}项存在漏洞
        </div>
        
        <h3>详细测试结果:</h3>
        <div style="margin-bottom: 15px;">
          ${report.testResults.map(result => `
            <div style="margin-bottom: 5px; padding: 5px; background: ${result.status === 'VULNERABLE' ? '#ffe6e6' : '#e6ffe6'}; border-radius: 3px;">
              <strong>${result.test}:</strong> 
              <span style="color: ${result.status === 'VULNERABLE' ? '#d32f2f' : '#388e3c'};">
                ${result.status}
              </span>
              <br><small>${result.details}</small>
            </div>
          `).join('')}
        </div>

        ${report.vulnerabilities.length > 0 ? `
          <h3>发现的漏洞:</h3>
          <div style="margin-bottom: 15px;">
            ${report.vulnerabilities.map(vuln => `
              <div style="margin-bottom: 10px; padding: 10px; background: #fff3cd; border-left: 4px solid ${this.getSeverityColor(vuln.severity)}; border-radius: 3px;">
                <strong style="color: ${this.getSeverityColor(vuln.severity)};">
                  [${vuln.severity}] ${vuln.type}
                </strong>
                <p style="margin: 5px 0;">${vuln.description}</p>
                <small><strong>位置:</strong> ${vuln.location}</small>
              </div>
            `).join('')}
          </div>
        ` : '<p style="color: #388e3c;">✅ 未发现安全漏洞</p>'}

        <button onclick="document.getElementById('security-report').remove()" style="
          background: #333;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 15px;
        ">关闭报告</button>
      </div>
    `

    document.body.insertAdjacentHTML('beforeend', reportHtml)
  }

  getRiskColor(riskLevel) {
    const colors = {
      'HIGH': '#d32f2f',
      'MEDIUM': '#f57c00',
      'LOW': '#fbc02d',
      'SECURE': '#388e3c'
    }
    return colors[riskLevel] || '#333'
  }

  getSeverityColor(severity) {
    const colors = {
      'HIGH': '#d32f2f',
      'MEDIUM': '#f57c00',
      'LOW': '#fbc02d'
    }
    return colors[severity] || '#333'
  }
}

// 导出安全测试器
window.SecurityTester = SecurityTester