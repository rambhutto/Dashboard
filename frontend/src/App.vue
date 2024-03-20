<script setup>
import TestChart from "@/components/TestChart.vue";
import {onMounted, ref, watch} from "vue";

const dashboard = ref("")
const err = ref("")

const currentDataTable = ref({})
let extensions = ref({})

let worksheets = ref()

let selectedColumns = ref()
let linkColumns = ref()
let sizeColumn = ref(6)
let categoryColumn = ref(2)
let selectedWorkSheet = ref()
onMounted(async () => {
      try {
        await initTableau()
        let worksheet = await getWorkSheet()
        let dataTable = await getSummaryDataTables(worksheet)
        dataTable = await getSourcesDataTables(worksheet)
        currentDataTable.value = dataTable

        worksheets.value = await getAllWorkSheets()
      } catch (error) {
        err.value = error;
      }
    }
)

function log(msg) {
  dashboard.value = dashboard.value + " " + JSON.stringify(msg)
}

async function initTableau() {
  extensions = window.tableau.extensions

  try {
    await extensions.initializeAsync()
  } catch
      (error) {
    err.value = error
  }
  return extensions
}

async function getSourcesDataTables(worksheet) {//Currently only returns one data table
  const dataSources = await worksheet.getDataSourcesAsync();
  const dataSource = dataSources[0];
  const logicalTables = await dataSource.getLogicalTablesAsync()
  const dataTable = await dataSource.getLogicalTableDataAsync(logicalTables[0].id);

  return dataTable
}

async function getSummaryDataTables(worksheet) {
  const dataTableReader = await worksheet.getSummaryDataReaderAsync();
  const dataTable = await dataTableReader.getAllPagesAsync();
  await dataTableReader.releaseAsync();
  return dataTable
}

async function getWorkSheet(worksheetName) {
  worksheetName = "Imdb_WS"
  if (selectedWorkSheet.value != null) {
    worksheetName = selectedWorkSheet.value.name; // Name of the worksheet, make it dynamic later
  }
  return extensions.dashboardContent.dashboard.worksheets.find(w => w.name === worksheetName)
}

async function getAllWorkSheets() {
  return extensions.dashboardContent.dashboard.worksheets
}

async function convertCellsToJsonObject(colsToInclude, sizeCol) {
  if (sizeColumn.value !== null && typeof sizeColumn.value === "object") {
    sizeCol = sizeColumn.value["index"]
  }
  let column = 2
  if (categoryColumn.value !== null && typeof categoryColumn.value === "object") {
    column = sizeColumn.value["index"]
  }
  let nodeList = []
  await initTableau()

  colsToInclude = [7, 8]

  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)

  nodeList = []

  let categoriesObj = await generateCategories()
  let pushedCategories = categoriesObj["pushedCategories"]

  dataTable.data.forEach((row, rowIndex) => {
    let node = {}
    row.forEach((col, colIndex) => {
      if (colsToInclude.includes(colIndex)) {
        node[dataTable.columns[colIndex].fieldName] = col.value
      }
      if (sizeCol === colIndex) {
        node["size"] = col.value
      }
      if (colIndex === 2) {
        node["category"] = pushedCategories.indexOf(col.value)
      }
    })
    node["id"] = rowIndex
    nodeList.push(node)
  })
  //Find out columns in he sheet
  return nodeList
}

async function getColumns() {
  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)
  columns.value.length = 0
  columns.value.push(...dataTable.columns)
}

let nodes = ref(null)
let edges = ref(null)
let categories = ref(null)

let columns = ref([])
// could just call it in mount
convertCellsToJsonObject().then(res => {
  nodes.value = res
})

generateLinks().then((res => {
  edges.value = res
}))


watch((selectedWorkSheet), async () => {
  await getColumns()
  await generateLinks()
})

watch((sizeColumn), async () => {
  convertCellsToJsonObject().then(res => {
    nodes.value = res
  })

  generateLinks().then((res => {
    edges.value = res
  }))

  generateCategories().then((res => {
    categories.value = res["categories"]
  }))
  log("this happeend" + sizeColumn.value.index)
})

let selected = ref([])

async function generateLinks(columnsToLinkOn) {
  await initTableau()

  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)

  columnsToLinkOn = [8]
  let colsToList = {}
  dataTable.data.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
      if (columnsToLinkOn.includes(colIndex)) {
        if (colsToList[colIndex]) {
          colsToList[colIndex].push(col.value)
        } else {
          colsToList[colIndex] = [col.value]
        }
      }
    })
  })

  let linkList = []
  let pushed = []
  //Change the ordering of this for optimization
  dataTable.data.forEach((row, rowIndex) => {
    let link = {}
    row.forEach((col, colIndex) => {
      columnsToLinkOn.forEach((columnToLinkOn) => {
        if (columnsToLinkOn.includes(colIndex)) {
          if (colsToList[columnToLinkOn].includes(col.value) && !pushed.includes(col.value)) {
            let indices = []

            colsToList[columnToLinkOn].forEach((value, index) => {
              if (value === col.value) {
                indices.push(index);
              }
            })

            if (indices.includes(rowIndex) && indices.length > 1) {
              indices.forEach(val => {
                if (rowIndex !== val) {
                  link = {
                    "source": rowIndex,
                    "target": val,
                  }
                  linkList.push(link)
                  pushed.push(col.value)
                }
              })
            }
          }
        }
      })
    })
  })
  return linkList
}

async function generateCategories(column) {
  column = 2
  if (categoryColumn.value !== null && typeof categoryColumn.value === "object") {
    column = 2
  }
  await initTableau()

  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)

  let categories = []
  let pushedCategories = []
  dataTable.data.forEach((row, rowIndex) => {
    let category = {}
    row.forEach((col, colIndex) => {
      if (column === colIndex && !pushedCategories.includes(col.value)) {
        category["name"] = col.value
        pushedCategories.push(col.value)
        categories.push(category)
      }
    })
  })
  return {"categories": categories, "pushedCategories": pushedCategories}
}
</script>

<template>
  <q-layout>
    <q-drawer
        show-if-above
        :width="200"
        elevated
        class=" text-white"
    >
      <q-scroll-area class="fit">
        <q-select v-model="selectedWorkSheet" clearable optionLabel="name" :options="worksheets"
                  label="Select Worksheet"></q-select>
        <!--  <q-select v-model="selectedColumns" optionLabel="fieldName" showClear :options="columns" label="Node"></q-select>-->
        <!--  <q-select v-model="linkColumns" optionLabel="fieldName" showClear :options="columns" label="LinkOn"></q-select>-->
        <q-select v-model="sizeColumn" optionLabel="fieldName" showClear :options="columns" label="Size On"></q-select>
        <button></button>
      </q-scroll-area>
    </q-drawer>
    <q-page-container>
      <q-page padding>

        <p>{{ err }}</p>
        <p class="text-wrap"> {{ dashboard }} </p>
        <div style="height:600px">
          <test-chart :nodes="nodes" :edges="edges" :categories="categories"></test-chart>
        </div>


      </q-page>
    </q-page-container>
  </q-layout>

  <!--  <q-table-->
  <!--      :rows="currentDataTable.data"-->
  <!--      :columns="currentDataTable.columns"-->
  <!--      row-key="rowIndex"-->
  <!--      :style="{ height: '70vh' }"-->
  <!--      :dense="true"-->
  <!--      v-model:selected="selected"-->
  <!--      selection="single"-->
  <!--  >-->
  <!--  </q-table>-->
  <!--  <div class="q-mt-md">-->
  <!--    Selected: {{ JSON.stringify(selected) }}-->
  <!--  </div>-->
</template>

<style scoped>
</style>
