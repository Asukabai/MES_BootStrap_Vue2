<template>
  <div class="vat-calculator-container">
    <div class="calculator-content">
      <div class="input-section">
        <van-cell-group>
          <van-field
            v-model="amount"
            label="金额（元）"
            placeholder="请输入金额"
            type="number"
            :border="true"
          />

          <van-cell title="计算类型" :value="amountTypeText" @click="showAmountTypePicker = true" />

          <van-cell title="选择增值税率" :value="`${currentTaxRate}%`" @click="showTaxRatePicker = true" />
        </van-cell-group>

        <div class="button-container">
          <van-button type="info" size="large" @click="calculateTax">计算增值税</van-button>
          <van-button type="default" size="large" @click="resetCalculator" style="margin-top: 10px;">重置</van-button>
        </div>
      </div>

      <div class="results-section">
        <van-cell-group>
          <van-cell title="不含税价格" :value="results.priceWithoutTax" />
          <van-cell title="增值税额" :value="results.taxAmount" :value-class="['highlight']" />
          <van-cell title="含税价格" :value="results.priceWithTax" />
          <van-cell title="适用税率" :value="`${currentTaxRate}%`" />
        </van-cell-group>
      </div>
    </div>

    <!-- 计算类型选择器 -->
    <van-popup v-model="showAmountTypePicker" position="bottom">
      <van-picker
        :columns="amountTypeColumns"
        @confirm="onAmountTypeConfirm"
        @cancel="showAmountTypePicker = false"
        show-toolbar
      />
    </van-popup>

    <!-- 税率选择器 -->
    <van-popup v-model="showTaxRatePicker" position="bottom">
      <van-picker
        :columns="taxRateColumns"
        @confirm="onTaxRateConfirm"
        @cancel="showTaxRatePicker = false"
        show-toolbar
      />
    </van-popup>

    <CustomizableFloatingButton
      :initial-position="{ bottom: 90, right: 20 }"
      :icon-src="require('@/assets/返回.png')"
      :background-size="49"
      :icon-size="49"
      :on-click="goBack"
    />

    <!-- 页脚 -->
    <div class="footer">
      <p>本计算器仅供参考，实际税务计算请以税务机关规定为准</p>
      <p>@ {{ currentYear }} <a href="https://www.sensor-smart.com/" target="_blank">陕西晟思智能测控有限公司</a></p>
    </div>
  </div>
</template>

<script>
import { Toast } from 'vant'
import CustomizableFloatingButton from "./CustomizableFloatingButton.vue";

export default {
  name: 'VatCalculator',
  components: {CustomizableFloatingButton},
  data() {
    return {
      amount: '',
      amountType: 'withTax', // 'withTax' 或 'withoutTax'
      currentTaxRate: 6, // 默认税率
      results: {
        priceWithoutTax: '0.00',
        taxAmount: '0.00',
        priceWithTax: '0.00'
      },
      calculationHistory: [],
      showAmountTypePicker: false,
      showTaxRatePicker: false,
      currentYear: new Date().getFullYear(), // 当前年份
      amountTypeColumns: [
        { text: '根据含税价格计算', value: 'withTax' },
        { text: '根据不含税价格计算', value: 'withoutTax' }
      ],
      taxRateColumns: [
        { text: '3%', value: 3 },
        { text: '6%', value: 6 },
        { text: '9%', value: 9 },
        { text: '10%', value: 10 },
        { text: '11%', value: 11 },
        { text: '13%', value: 13 }
      ]
    }
  },
  computed: {
    amountTypeText() {
      return this.amountType === 'withTax' ? '根据含税价格计算' : '根据不含税价格计算'
    }
  },
  mounted() {
    // 加载历史记录
    this.loadHistoryFromStorage()
  },
  methods: {
    goBack() {
      // this.$router.go(-1);
      this.navigateTo('/index');
    },
    navigateTo(path) {
      const department = this.$route.params.department;
      if (department) {
        this.$router.push(`/${department}${path}`);
      } else {
        console.error('未找到 department 参数');
        this.$toast.fail('路由参数缺失');
      }
    },
    calculateTax() {
      const amount = parseFloat(this.amount)

      // 验证输入
      if (!amount || amount <= 0) {
        Toast('请输入有效的金额（大于0）')
        return
      }

      let priceWithoutTax, taxAmount, priceWithTax
      const taxRate = this.currentTaxRate / 100

      if (this.amountType === 'withTax') {
        // 根据含税价格计算
        priceWithTax = amount
        priceWithoutTax = priceWithTax / (1 + taxRate)
        taxAmount = priceWithTax - priceWithoutTax  // 修正：正确计算税额
      } else {
        // 根据不含税价格计算
        priceWithoutTax = amount
        taxAmount = priceWithoutTax * taxRate
        priceWithTax = priceWithoutTax + taxAmount
      }

      // 更新结果显示
      this.results = {
        priceWithoutTax: priceWithoutTax.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        priceWithTax: priceWithTax.toFixed(2)  // 修复：修正变量名
      }

      // 保存到历史记录
      this.addToHistory(priceWithoutTax, taxAmount, priceWithTax)

      // 显示成功提示
      Toast('计算完成')
    },
    resetCalculator() {
      this.amount = ''
      this.results = {
        priceWithoutTax: '0.00',
        taxAmount: '0.00',
        priceWithTax: '0.00'
      }
      Toast('已重置计算器')  // 添加重置提示
    },
    addToHistory(priceWithoutTax, taxAmount, priceWithTax) {
      const calculation = {
        date: new Date().toLocaleString(),
        taxRate: this.currentTaxRate,
        priceWithoutTax: priceWithoutTax.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        priceWithTax: priceWithTax.toFixed(2),
        amountType: this.amountType === 'withTax' ? '含税价' : '不含税价'
      }

      this.calculationHistory.unshift(calculation) // 添加到开头

      // 限制历史记录数量
      if (this.calculationHistory.length > 10) {
        this.calculationHistory = this.calculationHistory.slice(0, 10)
      }

      // 保存到本地存储
      this.saveHistoryToStorage()
    },
    saveHistoryToStorage() {
      try {
        localStorage.setItem('vatCalculatorHistory', JSON.stringify(this.calculationHistory))
      } catch (e) {
        console.warn('无法保存历史记录到本地存储:', e)
      }
    },
    loadHistoryFromStorage() {
      try {
        const savedHistory = localStorage.getItem('vatCalculatorHistory')
        if (savedHistory) {
          this.calculationHistory = JSON.parse(savedHistory)
        }
      } catch (e) {
        console.warn('无法从本地存储加载历史记录:', e)
      }
    },
    onAmountTypeConfirm(value) {
      this.amountType = value.value
      this.showAmountTypePicker = false
    },
    onTaxRateConfirm(value) {
      this.currentTaxRate = value.value
      this.showTaxRatePicker = false
    }
  }
}
</script>

<style scoped>
.vat-calculator-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.calculator-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.input-section {
  background-color: white;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.results-section {
  background-color: white;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.button-container {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px; /* 按钮间距 */
}
.button-container .van-button {
  border-radius: 50px; /* 更圆滑的边角 */
  height: 50px; /* 统一高度 */
  font-weight: 600; /* 字体加粗 */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* 立体阴影 */
  transition: all 0.3s ease; /* 平滑过渡效果 */
  border: none; /* 移除默认边框 */
}

.button-container .van-button::before {
  border-radius: 50px; /* 确保伪元素也有圆角 */
}

.button-container .van-button:active {
  transform: translateY(2px); /* 点击时下沉效果 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 点击时阴影变化 */
}

/* 特定按钮样式 */
.button-container .van-button--info {
  background: linear-gradient(145deg, #1989fa, #0d7bea); /* 渐变背景 */
}

.button-container .van-button--default {
  background: linear-gradient(145deg, #f2f3f5, #dcdde0); /* 浅色渐变 */
  color: #323233;
}

.highlight {
  color: #e74c3c;
  font-weight: bold;
}

.footer {
  padding: 16px;
  text-align: center;
  background-color: #f5f7fa;
  border-top: 1px solid #ebedf0;
  color: #969799;
  font-size: 12px;
  line-height: 1.5;
}

.footer p {
  margin: 0 0 4px 0;
}

.footer p:last-child {
  margin-bottom: 0;
}

.footer a {
  color: #969799;
  text-decoration: underline;
}
</style>
