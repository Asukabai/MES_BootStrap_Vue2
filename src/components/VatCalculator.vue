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

      <div class="history-section" v-if="calculationHistory.length > 0">
        <van-cell title="计算历史" />
        <van-list>
          <van-cell
            v-for="(item, index) in calculationHistory"
            :key="index"
            :title="`${item.date}`"
            :label="`税率: ${item.taxRate}%, 方式: ${item.amountType} | 不含税: ${item.priceWithoutTax}元, 税额: ${item.taxAmount}元, 含税: ${item.priceWithTax}元`"
          />
        </van-list>
      </div>
    </div>

    <!-- 计算类型选择器 -->
    <van-popup v-model="showAmountTypePicker" position="bottom">
      <van-picker
        :columns="amountTypeColumns"
        @confirm="onAmountTypeConfirm"
        @cancel="showAmountTypePicker = false"
      />
    </van-popup>

    <!-- 税率选择器 -->
    <van-popup v-model="showTaxRatePicker" position="bottom">
      <van-picker
        :columns="taxRateColumns"
        @confirm="onTaxRateConfirm"
        @cancel="showTaxRatePicker = false"
      />
    </van-popup>
  </div>
</template>

<script>
import { Toast } from 'vant'

export default {
  name: 'VatCalculator',
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
      this.$router.go(-1)
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
        taxAmount = priceWithoutTax * taxRate
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
        priceWithTax: priceWithTax.toFixed(2)
      }

      // 保存到历史记录
      this.addToHistory(priceWithoutTax, taxAmount, priceWithTax)
    },
    resetCalculator() {
      this.amount = ''
      this.results = {
        priceWithoutTax: '0.00',
        taxAmount: '0.00',
        priceWithTax: '0.00'
      }
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

      Toast('计算完成')
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

.history-section {
  background-color: white;
  border-radius: 10px;
  padding: 16px;
}

.button-container {
  margin-top: 20px;
}

.highlight {
  color: #e74c3c;
  font-weight: bold;
}
</style>
