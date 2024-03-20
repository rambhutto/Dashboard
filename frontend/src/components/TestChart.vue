<script setup>
import {use} from 'echarts/core';
import {CanvasRenderer} from 'echarts/renderers';
import {GraphChart, PieChart} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import {ref, watch} from 'vue';

//Apache Echart related
use([
  CanvasRenderer,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphChart
]);

const props = defineProps({
  nodes: undefined,
  edges: undefined,
  categories: undefined,
  legend: undefined
})

const option = ref();//Graph Options

let max = ref(0)
let min = ref(Number.MAX_SAFE_INTEGER)


//Call function on prop change/update
watch(() => [props.edges, props.nodes, props.categories], () => {
  if (props.nodes) {
    findMaxMin()
    makeGraph()
  }
}, {immediate: true})

//findMaximum and minimum of a give node list, used for normalization
function findMaxMin() {
  props.nodes.forEach((node, rowIndex) => {
    if (node["size"]) {
      if (node["size"] > max.value) {
        max.value = node["size"]
      }

      if (node["size"] < min.value) {
        min.value = node["size"]
      }
    }
  })
}

//Normalize value so that graph values are easier to read
function normalizeValue(value) {
  if (!value) {
    return 25
  }
  return (value - min.value) / (max.value - min.value) * 25;
}

function makeGraph() {
  option.value = {
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 400,
      data: props.legend
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        animation: false,
        label: {
          position: 'right',
          formatter: '{b}'
        },
        draggable: true,
        data: props.nodes.map(function (node, idx) {
          node.name = node["Series Title"]
          node.id = node["id"]
          node["size"] = node["size"]
          node.symbolSize = normalizeValue(node["size"])
          return node;
        }),
        // categories: data.value.categories,
        force: {
          edgeLength: 15,
          repulsion: 20,
          gravity: 0.2
        },
        edges: props.edges,
        categories: props.categories,
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 10
          }
        }
      }
    ],
  }
}


</script>

<template>
  <v-chart class="chart" :option="option" autoresize/>
</template>

<style scoped>
.chart {
  height: 100%;
  width: 75%;
}
</style>
