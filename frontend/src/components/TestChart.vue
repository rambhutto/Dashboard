<script setup>
import {use} from 'echarts/core';
import {CanvasRenderer} from 'echarts/renderers';
import {GraphChart, PieChart} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import VChart, {THEME_KEY} from 'vue-echarts';
import {ref, provide, onMounted, inject} from 'vue';

const $axios = inject('$axios')  // inject axios

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphChart
]);

provide(THEME_KEY, 'dark');
let response = ref({})
onMounted(() => {
  $axios.get("/get_dummy_data/").then((res) => {
    response.value = res.data
    option.value = {
      title: {
        text: 'Les Miserables',
        subtext: 'Default layout',
        top: 'bottom',
        left: 'right'
      },
      tooltip: {},
      legend: [
        {
          // selectedMode: 'single',
          data: response.value.categories.map(function (a) {
            return a.name;
          })
        }
      ],
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',

      series: [
        {
          name: 'Les Miserables',
          type: 'graph',
          layout: 'none',
          data: response.value.nodes,
          links: response.value.links,
          categories: response.value.categories,
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}'
          },
          labelLayout: {
            hideOverlap: true
          },
          scaleLimit: {
            min: 0.4,
            max: 2
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          }
        }
      ],
    }
  })
})

const option = ref();
</script>

<template>
  <v-chart class="chart" :option="option" autoresize/>
</template>

<style scoped>
.chart {
  height: 90vh;
  width: 75vw;
}
</style>
