<script setup>
import TestChart from "@/components/TestChart.vue";
import {onMounted, ref, watch} from "vue";

const dashboard = ref("")

let tableau

//Props
let nodes = ref(null)
let edges = ref(null)
let categories = ref(null)
let legend = ref(null)

let worksheets = ref()

//WorkSheet
let selectedWorkSheet = ref()
//All Columns
let columns = ref([])
let numericColumns = ref([])
//Option Columns
let nameColumn = ref()
let linkColumns = ref()
let sizeColumn = ref()
let categoryColumn = ref()
//Use underlying data
let useUnderLyingData = ref(false)
//Settings Button
let settingsButtonDisabled = ref(false)
const unregisterHandlerFunctions = [];

onMounted(async () => {
      try {
        tableau = await initTableau()
        worksheets.value = await getAllWorkSheets()
        await setSettings()
        await test()
      } catch (error) {
        console.log(error)
      }
    }
)

async function test() {
  const markSelection = window.tableau.TableauEventType.MarkSelectionChanged
  let test = await getWorkSheet("Imdb_WS")
  test.addEventListener(markSelection, (selectionEvent) => {
    test.getSelectedMarksAsync().then((marks) => {
      console.log(marks)
    });

  })
}

async function initTableau() {
  let tableauExt = window.tableau.extensions

  try {
    await tableauExt.initializeAsync()
  } catch
      (error) {
    console.log(error)
  }
  return tableauExt
}

//Improve later
async function setSettings() {
  let settings = tableau.settings.getAll()

  if (settings.hasOwnProperty("selectedWorkSheet")) {
    selectedWorkSheet.value = {}
    selectedWorkSheet.value.name = settings["selectedWorkSheet"]
  }

  useUnderLyingData.value = settings.hasOwnProperty("useUnderLyingData") ? JSON.parse(settings["useUnderLyingData"].toLowerCase()) : false;
  await getColumns()

  const optionSettings = ["nameColumn", "linkColumns", "sizeColumn", "categoryColumn"];
  optionSettings.forEach(option => {
    if (settings.hasOwnProperty(option)) {
      const column = columns.value[settings[option]]
      eval(`${option}.value = column`);
    }
  })
}

async function setAndSaveSettings() {
  settingsButtonDisabled.value = true

  if (selectedWorkSheet.value) {
    tableau.settings.set("selectedWorkSheet", selectedWorkSheet.value.name);
  }

  if (useUnderLyingData.value) {
    tableau.settings.set("useUnderLyingData", useUnderLyingData.value);
  }

  const optionSettings = ["nameColumn", "linkColumns", "sizeColumn", "categoryColumn"];
  optionSettings.forEach(option => {
    if (eval(`${option}.value`)) {
      tableau.settings.set(option, eval(`${option}.value.index`));
    }
  })

  await tableau.settings.saveAsync()
  settingsButtonDisabled.value = false
}

async function getWorkSheet(worksheetName) {
  if (selectedWorkSheet.value != null) {
    worksheetName = selectedWorkSheet.value.name; // Name of the worksheet, make it dynamic later
    return tableau.dashboardContent.dashboard.worksheets.find(w => w.name === worksheetName)
  }
}

async function getAllWorkSheets() {
  return tableau.dashboardContent.dashboard.worksheets
}

async function getDataTables(worksheet) {
  return useUnderLyingData.value ? getSourcesDataTables(worksheet) : getSummaryDataTables(worksheet)
}

async function getSourcesDataTables(worksheet) {//Currently only returns one data table
  const dataSources = await worksheet.getDataSourcesAsync();
  const dataSource = dataSources[0];
  const logicalTables = await dataSource.getLogicalTablesAsync()
  const dataTable = await dataSource.getLogicalTableDataAsync(logicalTables[0].id);

  return dataTable
}

async function getSummaryDataTables(worksheet) {
  const dataTableReader = await worksheet.getSummaryDataReaderAsync(undefined, {"ignoreSelection": true});
  const dataTable = await dataTableReader.getAllPagesAsync();
  await dataTableReader.releaseAsync();
  return dataTable
}

async function getColumns() {
  let worksheet = await getWorkSheet()
  let dataTable = await getDataTables(worksheet)

  columns.value.length = 0
  columns.value.push(...dataTable.columns)

  numericColumns.value.length = 0
  numericColumns.value.push(...dataTable.columns.filter(column => column.dataType === "int" || column.dataType === "float"))
}

async function convertCellsToJsonObject() {
  if (!(nameColumn.value !== null && typeof nameColumn.value === "object")) {
    return []
  }

  let nodeList = []

  let worksheet = await getWorkSheet()
  let dataTable = await getDataTables(worksheet)
  let categoriesObj = await generateCategories()
  let pushedCategories = categoriesObj["pushedCategories"]

  dataTable.data.forEach((row, rowIndex) => {
    const node = {
      id: rowIndex,
      name: "",
      size: 25,
      category: ""
    }

    row.forEach((col, colIndex) => {
      if (nameColumn.value?.index === colIndex) {
        node["name"] = col.value
      }

      if (sizeColumn.value?.index === colIndex) {
        node["size"] = col.value;
      }

      if (categoryColumn.value?.index === colIndex) {
        node["category"] = pushedCategories.indexOf(col.value.toString());
      }
    })
    nodeList.push(node)
  })
  return nodeList
}

async function generateLinks() {
  if (!(linkColumns.value !== null && typeof linkColumns.value === "object")) {
    return []
  }

  let worksheet = await getWorkSheet()
  let dataTable = await getDataTables(worksheet)
  let linkList = []
  //Change the ordering of this for optimization/performance
  linkColumns.value.forEach((column) => {
    for (let firstRow = 0; firstRow < dataTable.totalRowCount; firstRow++) {
      for (let secondRow = firstRow + 1; secondRow < dataTable.totalRowCount; secondRow++) {
        if (dataTable.data[firstRow][column.index]["value"] === dataTable.data[secondRow][column.index]["value"]) {
          linkList.push({source: firstRow, target: secondRow});
        }
      }
    }
  })
  let pushed = []
  if (linkList.length > 1600) {
    linkList = []
    linkColumns.value.forEach((column) => {
      for (let firstRow = 0; firstRow < dataTable.totalRowCount; firstRow++) {
        for (let secondRow = firstRow + 1; secondRow < dataTable.totalRowCount; secondRow++) {
          if (dataTable.data[firstRow][column.index]["value"] === dataTable.data[secondRow][column.index]["value"] && !pushed.includes(dataTable.data[secondRow][column.index]["value"])) {
            linkList.push({source: firstRow, target: secondRow});
            pushed.push(dataTable.data[secondRow][column.index]["value"])
          }
        }
      }
    })
  }
  return linkList
}

async function generateCategories(column) {
  if (categoryColumn.value !== null && typeof categoryColumn.value === "object") {
    column = categoryColumn.value["index"]
  } else {
    return {"categories": [], "pushedCategories": []}
  }

  let worksheet = await getWorkSheet()
  let dataTable = await getDataTables(worksheet)

  let categories = []
  let pushedCategories = []
  dataTable.data.forEach((row, rowIndex) => {
    let category = {}
    row.forEach((col, colIndex) => {
      if (column === colIndex && !pushedCategories.includes(col.value)) {
        category["name"] = col.value.toString()
        pushedCategories.push(col.value.toString())
        categories.push(category)
      }
    })
  })
  return {"categories": categories, "pushedCategories": pushedCategories}
}

function clearColumnsValues() {
  nameColumn.value = null
  linkColumns.value = null
  sizeColumn.value = null
  categoryColumn.value = null
}

watch([selectedWorkSheet, useUnderLyingData, nameColumn, linkColumns, sizeColumn, categoryColumn], async () => {
  await getColumns()
  nodes.value = await convertCellsToJsonObject()
  edges.value = await generateLinks()

  let cat = await generateCategories()
  categories.value = cat["categories"]
  legend.value = cat["pushedCategories"]
  console.log(nodes)
})


</script>

<template>
  <p class="text-wrap"> {{ dashboard }} </p>
  <div style="height:600px; min-width:200px">
    <test-chart :nodes="nodes" :edges="edges" :categories="categories" :legend="legend"></test-chart>
  </div>
  <div>
    <div class="row">
      <div class="col  ">
        <q-select v-model="selectedWorkSheet" clearable optionLabel="name" :options="worksheets"
                  label="Select Worksheet"></q-select>
      </div>
      <div class="col">
        <q-checkbox v-model="useUnderLyingData" label="Use Underlying Raw Data"
                    @click="clearColumnsValues()"></q-checkbox>
      </div>
    </div>
    <div class="row">
      <div class="col q-mr-md">
        <q-select v-model="nameColumn" optionLabel="fieldName" showClear :options="columns"
                  label="Name Column"></q-select>
      </div>
      <div class="col">
        <q-select v-model="linkColumns" multiple optionLabel="fieldName" showClear :options="columns"
                  label="Connect On"></q-select>
      </div>
    </div>
    <div class="row">
      <div class="col q-mr-md">
        <q-select v-model="sizeColumn" optionLabel="fieldName" showClear :options="numericColumns"
                  label="Size On"></q-select>
      </div>
      <div class="col">
        <q-select v-model="categoryColumn" optionLabel="fieldName" showClear :options="columns"
                  label="Color On"></q-select>
      </div>
    </div>

    <div class="row">
      <div class="col q-mr-md">
        <q-btn @click="setAndSaveSettings()" :disable="settingsButtonDisabled">Save Data</q-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
