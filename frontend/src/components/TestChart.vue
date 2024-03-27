<script setup>
import {use} from 'echarts/core';
import {CanvasRenderer} from 'echarts/renderers';
import {GraphChart} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import {ref, toRaw, watch} from 'vue';

//Apache Echart related
use([
  CanvasRenderer,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphChart,
]);

const props = defineProps({
  nodes: undefined,
  edges: undefined,
  categories: undefined,
  legend: undefined,
  selectedNodes: undefined,
})

const option = ref();//Graph Options

let chart = ref()

let max = ref(0)
let min = ref(Number.MAX_SAFE_INTEGER)

//Call function on prop change/update
watch(() => [props.nodes, props.edges, props.categories, props.legend], () => {
  if (props.nodes) {
    findMaxMin()
    makeGraph()
  }
}, {immediate: true})

watch(() => props.selectedNodes, async () => {
  if (chart.value) {
    console.log(toRaw(props.selectedNodes))
    console.log(props.nodes, toRaw(props.selectedNodes)[0])
    let newList = toRaw(props.selectedNodes).map((val) => val)
    chart.value.dispatchAction({"type": 'highlight', "name": newList})
  }
}, {immediate: true})

//findMaximum and minimum of a give node list, used for normalization
function findMaxMin() {
  max.value = 0
  min.value = Number.MAX_SAFE_INTEGER
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
  return (value - min.value) / (max.value - min.value) * 25 + 2;
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
        roam: true,
        label: {
          position: 'right',
          formatter: '{b}'
        },
        draggable: true,
        data: props.nodes.map(function (node, idx) {
          node.name = node["name"]
          node.id = node["id"]
          node["size"] = node["size"]

          node.symbolSize = normalizeValue(node["size"])
          return node;
        }),
        edges: props.edges,
        categories: props.categories,
        force: {
          edgeLength: 10,
          repulsion: 6,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 10
          }
        },
      }
    ],
  }
}


</script>

<template>
  <v-chart ref="chart" class="chart" :option="option" autoresize/>
</template>

<style scoped>
.chart {
  height: 100%;
  width: 75%;
}
</style>
