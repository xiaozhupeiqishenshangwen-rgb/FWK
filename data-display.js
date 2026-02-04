// data-display.js - 数据展示页面脚本
// 功能：从接口获取数据并展示，支持分页和刷新

// ==================== 工具函数 ====================

/**
 * 从URL参数获取Cookie
 * @returns {string} Cookie字符串
 */
function getCookieFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const cookieStr = urlParams.get('cookie');
    return cookieStr ? decodeURIComponent(cookieStr) : '';
}

/**
 * 从本地存储获取Cookie
 * @returns {Promise<string>} Cookie字符串
 */
function getCookieFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['loginCookies'], function(result) {
            resolve(result.loginCookies || '');
        });
    });
}

/**
 * 获取Cookie，优先使用URL参数中的Cookie
 * @returns {Promise<string>} Cookie字符串
 */
async function getCookie() {
    // 先从URL参数获取Cookie
    const urlCookie = getCookieFromUrl();
    if (urlCookie) {
        console.log('使用URL参数中的Cookie:', urlCookie);
        return urlCookie;
    }
    
    // 从本地存储获取Cookie
    const storageCookie = await getCookieFromStorage();
    if (storageCookie) {
        console.log('使用本地存储中的Cookie:', storageCookie);
        return storageCookie;
    }
    
    return '';
}

/**
 * 字符级闪烁出现动画
 * @param {HTMLElement} element 目标元素
 * @param {string|number} text 要显示的文本
 */
function animateTextWithFadeIn(element, text) {
    const chars = text.toString().split('');
    
    // 清空元素
    element.innerHTML = '';
    
    // 逐个添加字符并应用闪烁出现动画
    chars.forEach((char) => {
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.textContent = char;
        element.appendChild(charSpan);
        
        // 随机延迟，实现字符随机闪烁出现的效果
        const randomDelay = Math.floor(Math.random() * 300);
        setTimeout(() => {
            charSpan.classList.add('char-fade-in');
        }, randomDelay);
    });
}

// ==================== 数据请求 ====================

/**
 * 请求index/list接口，获取剩余数量
 * @returns {Promise<void>}
 */
async function requestIndexList() {
    const cookieValue = await getCookie();
    
    // 展示remainTotal元素
    const remainTotalElement = document.getElementById('remainTotal');
    if (remainTotalElement) {
        // 先显示加载中状态
        animateTextWithFadeIn(remainTotalElement, '0');
    }
    
    if (!cookieValue) {
        console.error('Cookie not found, cannot request index/list');
        return;
    }
    
    console.log('开始请求index/list，Cookie:', cookieValue);
    
    // 构建请求参数
    const url = 'https://blackcat2.vankeservice.com/platSellerWeb/index/list';
    
    try {
        // 向background script发送消息，请求数据
        const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'fetchData',
                url: url,
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9',
                    'Access-Control-Allow-Origin': '*',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Cookie': cookieValue,
                    'Origin': 'https://blackcat2.vankeservice.com',
                    'Referer': 'https://blackcat2.vankeservice.com/platSellerWeb/dist/dist-gray/index.html',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'tenantCode': 'null'
                },
                body: '{}'
            }, function(response) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        console.log('========================================');
        console.log('========== index/list 返回数据 ==========');
        console.log('========================================');
        console.log(JSON.stringify(result, null, 2));
        console.log('========================================');
        
        // 展示remainTotal，添加字符闪烁出现效果
        if (remainTotalElement) {
            let remainTotal = 0;
            
            // 检查返回值结构，根据返回格式提取remainTotal
            if (result && (result.code === 0 || result.code === '0') && result.data && result.data.length > 0) {
                // 获取第一个优惠券的剩余数量
                const coupon = result.data[0];
                remainTotal = coupon.remainTotal || parseInt(coupon.remainTotalStr || '0') || 0;
                console.log('Extracted remaining total:', remainTotal);
            } else if (result && (result.code === -2 || result.code === '-2')) {
                console.error('未登录:', result.errMsg);
            }
            
            // 为remainTotal添加字符闪烁出现效果
            animateTextWithFadeIn(remainTotalElement, remainTotal);
        }
    } catch (error) {
        console.error('Failed to request index/list:', error);
        // 请求失败时，显示默认值0
        if (remainTotalElement) {
            animateTextWithFadeIn(remainTotalElement, '0');
        }
    }
}

/**
 * 查询数据列表
 * @param {number} pageIndex 页码
 * @returns {Promise<void>}
 */
async function queryData(pageIndex = 1) {
    const cookieValue = await getCookie();
    
    if (!cookieValue) {
        console.error('Cookie not found');
        renderData(null);
        return;
    }
    
    console.log('========== 开始查询数据 ==========');
    console.log('Cookie:', cookieValue);
    
    // 构建请求参数，与curl命令完全一致
    const requestData = {
        "carNo": "",
        "pageSize": 50,
        "pageIndex": pageIndex,
        "status": 5
    };
    
    console.log('请求参数:', JSON.stringify(requestData));
    
    try {
        // 向background script发送消息，请求数据
        console.log('发送请求到background script...');
        
        const data = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'fetchData',
                url: 'https://blackcat2.vankeservice.com/platSellerWeb/coupon/send/list',
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9',
                    'Access-Control-Allow-Origin': '*',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Cookie': cookieValue,
                    'Origin': 'https://blackcat2.vankeservice.com',
                    'Referer': 'https://blackcat2.vankeservice.com/platSellerWeb/dist/dist-gray/index.html',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'tenantCode': 'null'
                },
                body: JSON.stringify(requestData)
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError.message);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        console.log('========================================');
        console.log('========== 接口返回数据 ==========');
        console.log('========================================');
        console.log(JSON.stringify(data, null, 2));
        console.log('========================================');
        
        console.log('data:', data);
        console.log('data类型:', typeof data);
        console.log('data.code:', data ? data.code : 'undefined');
        console.log('data.msg:', data ? data.msg : 'undefined');
        console.log('data.errMsg:', data ? data.errMsg : 'undefined');
        console.log('data.data:', data ? (data.data ? (Array.isArray(data.data) ? data.data.length + '条数据' : '非数组') : 'undefined') : 'undefined');
        
        // 检查返回数据
        if (data && (data.code === 0 || data.code === '0') && data.data) {
            console.log('数据有效，开始渲染');
            renderData(data);
            updatePaginationButtons(data);
        } else if (data && data.code !== 0 && data.code !== '0') {
            console.error('========================================');
            console.error('接口返回错误!');
            console.error('错误码:', data.code);
            console.error('错误信息:', data.msg || data.errMsg);
            console.error('完整响应:', JSON.stringify(data, null, 2));
            console.error('========================================');
            renderData(null);
        } else {
            console.error('请求返回错误或无数据');
            console.error('data:', data);
            renderData(null);
        }
    } catch (error) {
        console.error('Query failed:', error);
        renderData(null);
    }
}

// ==================== 数据渲染 ====================

/**
 * 更新分页按钮状态
 * @param {Object|null} data 分页数据
 */
function updatePaginationButtons(data) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!data) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    const currentPage = data.pageIndex || 1;
    const totalPage = data.totalPage || 1;
    
    // 更新按钮状态
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPage;
    
    // 添加点击事件
    prevBtn.onclick = function() {
        if (currentPage > 1) {
            queryData(currentPage - 1);
        }
    };
    
    nextBtn.onclick = function() {
        if (currentPage < totalPage) {
            queryData(currentPage + 1);
        }
    };
}

/**
 * 渲染数据到表格
 * @param {Object|null} data 数据
 */
function renderData(data) {
    const dataBody = document.getElementById('dataBody');
    const totalSize = document.getElementById('totalSize');
    const currentPage = document.getElementById('currentPage');
    const totalPage = document.getElementById('totalPage');
    const pageSize = document.getElementById('pageSize');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!data || !data.data || data.data.length === 0) {
        dataBody.innerHTML = '<tr><td colspan="4" class="no-data">暂无数据</td></tr>';
        totalSize.textContent = '0';
        currentPage.textContent = '1';
        totalPage.textContent = '1';
        pageSize.textContent = '50';
        pageInfo.textContent = '第 1 页，共 1 页';
        updatePaginationButtons(null);
        return;
    }
    
    // 更新统计信息
    function animateStatusNumber(element, value) {
        animateTextWithFadeIn(element, value);
    }
    
    // 更新状态数字，应用字符闪烁出现效果
    animateStatusNumber(totalSize, data.totalSize || 0);
    animateStatusNumber(currentPage, data.pageIndex || 1);
    animateStatusNumber(totalPage, data.totalPage || 1);
    animateStatusNumber(pageSize, 50); // 固定为50
    
    // 更新pageInfo文本
    pageInfo.textContent = `Page ${data.pageIndex || 1} of ${data.totalPage || 1}`;
    
    // 实现加载新数据时，原有行随机消失效果
    function fadeOutExistingRows(callback) {
        const existingRows = dataBody.querySelectorAll('tr');
        let animatedCount = 0;
        const totalRows = existingRows.length;
        
        if (totalRows === 0) {
            callback();
            return;
        }
        
        // 为每行添加随机消失效果
        existingRows.forEach(row => {
            // 跳过无数据提示行
            if (row.querySelector('.no-data')) {
                animatedCount++;
                if (animatedCount === totalRows) {
                    callback();
                }
                return;
            }
            
            const cells = row.querySelectorAll('td');
            let cellAnimatedCount = 0;
            const totalCells = cells.length;
            
            cells.forEach(cell => {
                // 保存原始内容
                const originalText = cell.textContent;
                const chars = originalText.split('');
                
                // 清空单元格
                cell.innerHTML = '';
                
                // 逐个添加字符并应用随机闪烁消失动画
                chars.forEach(char => {
                    const charSpan = document.createElement('span');
                    charSpan.className = 'char';
                    charSpan.textContent = char;
                    charSpan.style.opacity = '1';
                    cell.appendChild(charSpan);
                    
                    // 为每个字符设置随机延迟，实现随机闪烁消失效果
                    const randomDelay = Math.floor(Math.random() * 500);
                    setTimeout(() => {
                        charSpan.classList.add('char-fade-out');
                    }, randomDelay);
                });
                
                cellAnimatedCount++;
                if (cellAnimatedCount === totalCells) {
                    animatedCount++;
                    if (animatedCount === totalRows) {
                        // 等待所有字符动画完成后，执行回调
                        setTimeout(callback, 600);
                    }
                }
            });
        });
    }
    
    // 先让现有行随机消失，再加载新数据
    fadeOutExistingRows(() => {
        // 清空现有数据
        dataBody.innerHTML = '';
        
        // 先创建所有行，但不显示内容
        const rows = [];
        data.data.forEach((item) => {
            // 创建新行
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="id-column"></td>
                <td class="date-column"></td>
                <td class="count-column"></td>
                <td><button class="fuck-btn">FUCK</button></td>
            `;
            
            // 存储行信息
            rows.push({
                row: row,
                data: item
            });
            
            // 添加到表格中
            dataBody.appendChild(row);
        });
        
        // 为所有按钮添加点击事件
  dataBody.querySelectorAll('.fuck-btn').forEach(button => {
    button.addEventListener('click', async function() {
      // 获取当前行
      const currentRow = this.closest('tr');
      
      // 获取当前行的数据
      const idCell = currentRow.querySelector('.id-column');
      const id = idCell ? idCell.textContent.trim() : '';
      
      if (!id) {
        console.error('未找到ID');
        return;
      }
      
      console.log('点击了FUCK按钮，ID:', id);
      
      // 获取当前的cookie
      const cookie = await getCookie();
      console.log('使用的Cookie:', cookie);
      
      // 调用revert接口
      try {
        console.log('开始调用revert接口');
        
        // 向background script发送消息，请求数据
        const data = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'fetchData',
            url: 'http://blackcat2.vankeservice.com/platSellerWeb/coupon/send/revert',
            method: 'POST',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'zh-CN,zh;q=0.9',
              'Access-Control-Allow-Origin': '*',
              'Connection': 'keep-alive',
              'Content-Type': 'application/json;charset=UTF-8',
              'Cookie': cookie,
              'Origin': 'http://blackcat2.vankeservice.com',
              'Referer': 'http://blackcat2.vankeservice.com/platSellerWeb/dist/dist-gray/index.html',
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
              'tenantCode': 'null'
            },
            body: JSON.stringify({ id: id })
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.error('Chrome runtime error:', chrome.runtime.lastError.message);
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
        
        console.log('接口返回数据:', data);
        
        if (data && (data.code === 0 || data.code === '0')) {
          console.log('接口调用成功');
          // 实现字符级闪烁消失效果
          const cells = currentRow.querySelectorAll('td');
          cells.forEach(cell => {
            // 将单元格内容转换为字符数组
            const text = cell.textContent;
            const chars = text.split('');
            
            // 清空单元格
            cell.innerHTML = '';
            
            // 逐个添加字符并应用闪烁消失动画
            chars.forEach((char) => {
              const charSpan = document.createElement('span');
              charSpan.className = 'char';
              charSpan.textContent = char;
              cell.appendChild(charSpan);
              
              // 为每个字符设置随机延迟，实现随机闪烁消失效果
              const randomDelay = Math.floor(Math.random() * 500);
              setTimeout(() => {
                charSpan.classList.add('char-fade-out');
              }, randomDelay);
            });
          });
          
          // 等待所有字符动画完成后重新加载数据
          setTimeout(async function() {
            // 先更新Remaining值
            await requestIndexList();
            
            // 获取当前页码
            const currentPageElement = document.getElementById('currentPage');
            const currentPage = parseInt(currentPageElement.textContent) || 1;
            
            // 重新请求数据，实现字符闪烁出现的效果
            await queryData(currentPage);
          }, 1500); // 匹配字符闪烁消失动画的总持续时间
        } else {
          console.error('接口调用失败:', data.errMsg);
        }
      } catch (error) {
        console.error('调用接口时发生错误:', error);
      }
    });
  });
        
        // 为所有行同时应用字符闪烁出现效果
        rows.forEach(rowInfo => {
            const row = rowInfo.row;
            const item = rowInfo.data;
            
            // 获取Remaining值
            const remainTotalElement = document.getElementById('remainTotal');
            const remainTotal = parseInt(remainTotalElement.textContent) || 0;
            
            // 获取Send Count值
            const sendCount = parseInt(item.couponCount) || 0;
            
            // 计算总和，判断是否禁用按钮
            const total = remainTotal + sendCount;
            const isDisabled = total > 30;
            
            // 获取按钮并设置disabled属性
            const button = row.querySelector('.fuck-btn');
            if (button) {
                button.disabled = isDisabled;
            }
            
            // 获取单元格
            const idCell = row.querySelector('.id-column');
            const dateCell = row.querySelector('.date-column');
            const countCell = row.querySelector('.count-column');
            
            // 单元格内容
            const idText = item.id || '-';
            const dateText = item.createTime || '-';
            const countText = item.couponCount || 0;
            
            // 字符级闪烁出现效果函数
            function animateText(cell, text, delay) {
                const chars = text.toString().split('');
                
                chars.forEach((char) => {
                    setTimeout(() => {
                        const charSpan = document.createElement('span');
                        charSpan.className = 'char';
                        charSpan.textContent = char;
                        cell.appendChild(charSpan);
                        
                        // 随机延迟，实现字符随机闪烁出现的效果
                        const randomDelay = Math.floor(Math.random() * 300);
                        setTimeout(() => {
                            charSpan.classList.add('char-fade-in');
                        }, randomDelay);
                    }, delay);
                });
            }
            
            // 为每个单元格应用字符闪烁出现效果，无顺序延迟，所有字符同时开始随机出现
            animateText(idCell, idText, 0);
            animateText(dateCell, dateText, 0);
            animateText(countCell, countText, 0);
        });
    });
}

// ==================== 页面初始化 ====================

/**
 * 初始化页面
 * @returns {Promise<void>}
 */
async function initPage() {
    console.log('========== 开始初始化页面 ==========');
    
    // 获取标题元素
    const title = document.querySelector('h1');
    console.log('获取到标题元素:', title);
    
    // 通知popup页面展示cookie
    console.log('通知popup页面展示cookie');
    try {
      chrome.runtime.sendMessage({ action: 'showCookie' }, function(response) {
        if (chrome.runtime.lastError) {
          console.log('发送展示消息失败（popup页面可能未打开）:', JSON.stringify(chrome.runtime.lastError));
        } else {
          console.log('展示消息发送成功:', JSON.stringify(response));
        }
      });
    } catch (error) {
      console.log('发送消息时发生错误（popup页面可能未打开）:', JSON.stringify(error));
    }
    
    // 先请求index/list，获取remainTotal
    console.log('开始请求index/list');
    await requestIndexList();
    console.log('index/list请求完成');
    
    // 然后查询数据
    console.log('开始查询数据');
    await queryData();
    console.log('数据查询完成');
    
    // 页面加载完成后，为标题添加loaded类，停止闪烁效果
    if (title) {
        title.classList.add('loaded');
        console.log('添加loaded类到标题');
    }
    
    // 添加刷新按钮点击事件
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async function() {
      console.log('点击了刷新按钮');
      // 重新请求数据
      await requestIndexList();
      await queryData();
    });
  }
  
  // 添加测试清除按钮点击事件
  const testClearBtn = document.getElementById('testClearBtn');
  if (testClearBtn) {
    testClearBtn.addEventListener('click', function() {
      console.log('点击了测试清除按钮');
      clearCookies();
    });
  }
  
  console.log('========== 页面初始化完成 ==========');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage);

// 页面关闭时清空cookie并通知popup页面重置
function clearCookies() {
  console.log('=====================================');
  console.log('页面关闭，执行清空操作');
  console.log('=====================================');
  
  // 立即执行清空操作，不等待消息响应
  performClearOperation();
  
  // 直接通知popup页面重置，不依赖background.js
  console.log('尝试直接发送重置消息给popup页面');
  try {
    chrome.runtime.sendMessage({ action: 'reset' }, function(response) {
      if (chrome.runtime.lastError) {
        // 消息发送失败是正常的，因为popup页面可能没有打开
        console.log('消息发送失败（popup页面可能未打开）:', JSON.stringify(chrome.runtime.lastError));
      } else {
        console.log('重置消息发送成功:', JSON.stringify(response));
      }
    });
  } catch (error) {
    // 发生错误是正常的，因为popup页面可能没有打开
    console.log('发送消息时发生错误（popup页面可能未打开）:', JSON.stringify(error));
  }
  
  // 执行清空操作
  function performClearOperation() {
    // 直接清空存储的cookie，不依赖消息传递
    console.log('直接清空本地存储的cookie');
    chrome.storage.local.remove(['loginCookies', 'cookieFetchTime'], function() {
      if (chrome.runtime.lastError) {
        console.error('清除本地存储的cookie失败:', chrome.runtime.lastError);
      } else {
        console.log('本地存储的cookie已清空');
      }
    });
    
    // 清空浏览器中的cookie
    console.log('清空浏览器中的cookie');
    const cookieNames = ['acw_tc', 'JSESSIONID'];
    const url = 'https://blackcat2.vankeservice.com';
    
    cookieNames.forEach(cookieName => {
      chrome.cookies.remove({ url: url, name: cookieName }, function(details) {
        if (chrome.runtime.lastError) {
          console.error(`清除${cookieName}失败:`, chrome.runtime.lastError);
        } else {
          console.log(`${cookieName}已清空:`, details);
        }
      });
    });
    
    console.log('=====================================');
    console.log('清空操作执行完成');
    console.log('=====================================');
  }
}

// 使用pagehide事件，它在页面真正关闭时触发，允许异步操作完成
console.log('注册pagehide事件监听器');
document.addEventListener('pagehide', function(event) {
  console.log('=====================================');
  console.log('pagehide事件触发，执行清空操作');
  console.log('事件详情:', event);
  console.log('=====================================');
  clearCookies();
});

// 同时注册beforeunload事件，作为备份
console.log('注册beforeunload事件监听器');
document.addEventListener('beforeunload', function(event) {
  console.log('=====================================');
  console.log('beforeunload事件触发，执行清空操作');
  console.log('事件详情:', event);
  console.log('=====================================');
  clearCookies();
  
  // 阻止默认行为，确保事件能够正确触发
  // event.preventDefault();
  // event.returnValue = '';
});

// 注册unload事件，作为最后备份
console.log('注册unload事件监听器');
document.addEventListener('unload', function(event) {
  console.log('=====================================');
  console.log('unload事件触发，执行清空操作');
  console.log('事件详情:', event);
  console.log('=====================================');
  clearCookies();
});

// 注册visibilitychange事件监听器，当页面变为不可见时触发清空操作
console.log('注册visibilitychange事件监听器');
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    console.log('=====================================');
    console.log('页面变为不可见，执行清空操作');
    console.log('=====================================');
    clearCookies();
  }
});

// 保留pagehide和beforeunload事件监听器
// 这些事件只在页面真正关闭时触发，不会在切换标签页时触发
