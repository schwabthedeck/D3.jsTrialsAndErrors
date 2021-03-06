// code to render planned vs actual chart
// using D3.js 
// also designed to run in SharePoint

function renderChart(csvData) {
  var margin = { top: 10, right: 140, bottom: 150, left: 120 };
  var width = 820 - margin.left - margin.right;
  // putting off height measurement until we know how many employees we have
  // var height = 500 - margin.top - margin.bottom;

  var svg = d3.select(".chart")
    .attr("width", (width + margin.left + margin.right));
  //    .attr("height", (height + margin.top + margin.bottom));

  // commented out because it isn't supported in IE -_-
  // d3.csv('https://perkinseastman.sharepoint.com/accounting_/Accounting-Internal-Site/D3Data/planned_vs_actual_2020-03-17.csv', function (d) {
  //   return {
  //     EmployeeName: d.EmployeeName,
  //     StartDate: new Date(d.StartDate),
  //     EndDate: new Date(d.EndDate),
  //     Project: d.Project,
  //     PeriodHrs: +d.PeriodHrs,
  //     ActualRegHrs: +d.ActualRegHrs,
  //     ActualOvtHrs: +d.ActualOvtHrs,
  //     ScaleMaxHrs: +d.scale_maxhrs
  //   }
  // }).then(createCharts);
  createCharts(csvData);

  // append legend
  var colors = ["green", "red", "white"];
  var labels = ["Regular Time", "Overtime", "Planned Hours"];
  var legend = svg.selectAll(".legend")
    .data(labels)
    .enter().append("g")
    .attr("class", function (d, i) { return "legend " + d.replace(/ /g, "_") })
    .attr("transform", function (d, i) { return "translate(190," + (20 + (i * 19)) + ")"; });

  legend.append("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", function (d, i) { return colors.slice()[i]; });

  legend.append("text")
    .attr("x", width + 5)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "start")
    .text(function (d, i) { return labels.slice()[i] });

  function createCharts(data) {
    // array of charts
    var charts = [];
    // array of employees
    var employees = [];
    // used to track unique employees added to employees
    var uniqueEmployees = [];
    // set these all as first items values for comparison
    var minStartDate = data[0].StartDate;
    var maxEndDate = data[0].EndDate;
    var scaleMaxHours = data[0].ScaleMaxHrs;

    for (var i = 0; i < data.length; i++) {
      // check for unique employees name
      if (!uniqueEmployees[data[i].EmployeeName]) {
        employees.push(data[i].EmployeeName);
        uniqueEmployees[data[i].EmployeeName] = 1;
      }

      // check start date to set earliest date as start date for date range
      if (data[i].StartDate < minStartDate) {
        minStartDate = data[i].StartDate;
      }

      // check end date to set latest date as end date for date range
      if (data[i].EndDate > maxEndDate) {
        maxEndDate = data[i].EndDate;
      }

      // check scale max hours - want the largest number in the set
      if (data[i].ScaleMaxHrs > scaleMaxHours) {
        scaleMaxHours = data[i].ScaleMaxHrs;
      }

      // need to remove all NaN values and replace them with zeros
      if (isNaN(data[i].PeriodHrs)) { data[i].PeriodHrs = 0; }
      if (isNaN(data[i].ActualRegHrs)) { data[i].ActualRegHrs = 0; }
      if (isNaN(data[i].ActualOvtHrs)) { data[i].ActualOvtHrs = 0; }
    }

    // "nest" data by employee
    var nestedData = d3.nest()
      .key(function (d) { return d.EmployeeName })
      .entries(data);

    var employeeCount = nestedData.length;

    // calculate height here
    var perChartHeight = 150;
    var height = (perChartHeight * employeeCount) - margin.top - margin.bottom;
    svg.attr("height", (height + margin.top + margin.bottom + (perChartHeight + 20)));

    for (var i = 0; i < employeeCount; i++) {
      charts.push(new Chart({
        chartData: nestedData[i].values.slice(),
        width: width,
        height: height * (1 / employeeCount),
        maxDataPoint: scaleMaxHours,
        startDate: minStartDate,
        endDate: maxEndDate,
        svg: svg,
        id: i,
        name: nestedData[i].key,
        margin: margin,
        showBottomAxis: (i == employeeCount - 1)
      }));
    }

    function Chart(options) {
      this.chartData = options.chartData;
      this.width = options.width;
      this.height = options.height;
      this.maxDataPoint = options.maxDataPoint;
      this.startDate = options.startDate;
      this.endDate = options.endDate;
      this.svg = options.svg;
      this.id = options.id;
      this.name = options.name;
      this.margin = options.margin;
      this.showBottomAxis = options.showBottomAxis;

      var localEmployeeName = this.name;
      var chartHeight = this.height - 10;
      var barWidth = 15;

      var chartContainer = svg.append("g")
        .attr("height", chartHeight)
        .attr("width", this.width)
        .attr("class", "chart_" + this.id + " " + localEmployeeName.replace(/ /g, "_"))
        .attr("transform", "translate(" + this.margin.left + "," + (this.margin.top + (perChartHeight * this.id)) + ")");

      // x scale is time based
      var x = d3.scaleTime()
        .range([0, this.width])
        .domain([this.startDate, this.endDate]);

      // y scale is linear based on max hours
      var y = d3.scaleLinear()
        .range([chartHeight, 0])
        .domain([0, this.maxDataPoint]);

      // set up x-axis
      // one with labels for bottom chart
      var xAxisWithLabels = d3.axisBottom(x)
        .tickFormat(d3.timeFormat("%b-%d-%y"))
        .ticks(d3.timeMonday);
      // one without labels for all other charts
      var xAxisWithoutLabels = d3.axisBottom(x)
        .tickFormat(d3.timeFormat(""))
        .ticks(d3.timeMonday);
      // set up y-axis
      var yAxis = d3.axisRight(y)

      // grid lines in y axis function
      var yAxisGridLines = d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("");

      // append/create actual hours bars
      chartContainer.selectAll(".bar.actual-hours")
        .data(this.chartData)
        .enter().append("rect")
        .attr("class", "bar actual-hours")
        .attr("x", function (d) { return x(d3.timeMonday(d.StartDate)); })
        .attr("y", function (d) { return y(d.ActualRegHrs); })
        .attr("height", function (d) { return chartHeight - y(d.ActualRegHrs); })
        .attr("width", barWidth)
        .attr("dx", -5)
        .on("mouseover", function () { tooltip.style("display", null); })
        .on("mouseout", function () { tooltip.style("display", "none"); })
        .on("mousemove", updateToolTip);

      // append/create overtime hours bars
      chartContainer.selectAll(".bar.overtime-hours")
        .data(this.chartData)
        .enter().append("rect")
        .attr("class", "bar overtime-hours")
        .attr("x", function (d) { return x(d3.timeMonday(d.StartDate)); })
        .attr("y", function (d) { return y(d.ActualRegHrs + d.ActualOvtHrs); })
        .attr("height", function (d) { return chartHeight - y(d.ActualOvtHrs); })
        .attr("width", barWidth)
        .attr("dx", -5)
        .on("mouseover", function () { tooltip.style("display", null); })
        .on("mouseout", function () { tooltip.style("display", "none"); })
        .on("mousemove", updateToolTip);

      // append/create planned hours bars
      chartContainer.selectAll(".bar.planned-hours")
        .data(this.chartData)
        .enter().append("rect")
        .attr("class", "bar planned-hours")
        .attr("x", function (d) { return x(d3.timeMonday(d.StartDate)); })
        .attr("y", function (d) { return y(d.PeriodHrs); })
        .attr("height", function (d) { return chartHeight - y(d.PeriodHrs); })
        .attr("width", barWidth)
        .attr("dx", -5)
        .on("mouseover", function () { tooltip.style("display", null); })
        .on("mouseout", function () { tooltip.style("display", "none"); })
        .on("mousemove", updateToolTip);

      // only show bottom axis on last employee
      if (this.showBottomAxis) {
        chartContainer.append("g")
          .attr("class", "x axis bottom")
          .attr("transform", "translate(0," + chartHeight + ")")
          .call(xAxisWithLabels)
          .selectAll("text")
          .style("text-anchor", "end")
          .attr("dx", "-1em")
          .attr("dy", "-0.6em")
          .attr("transform", "rotate(-90)");
      } else {
        // otherwise just show the tick marks to help reading the chart
        chartContainer.append("g")
          .attr("class", "x axis bottom")
          .attr("transform", "translate(0," + chartHeight + ")")
          .call(xAxisWithoutLabels);
      }

      // append y-axis
      chartContainer.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + this.width + ",0)")
        .call(yAxis);

      // append y-axis grid lines
      chartContainer.append("g")
        .attr("class", "grid")
        .call(yAxisGridLines);

      // append employee name to left
      chartContainer.append("g")
        .append("text")
        .attr("x", -110)
        .attr("y", this.height / 3)
        .attr("dy", ".71em")
        .attr("text-anchor", "start")
        .attr("font-size", "1.1em")
        .text(localEmployeeName);

      // Prep the tooltip bits, initial display is hidden
      var tooltip = chartContainer.append("g")
        .attr("class", "tooltip")
        .style("display", "none");

      tooltip.append("rect")
        .attr("width", 90)
        .attr("height", 50)
        .attr("x", -30)
        .attr("fill", "white")
        .style("opacity", 0.75);

      tooltip.append("text")
        .attr("class", "week-of")
        .attr("x", 15)
        .attr("dy", "1.2em")
        .style("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "normal");

      tooltip.append("text")
        .attr("class", "regular-hours")
        .attr("x", 15)
        .attr("dy", "2.4em")
        .style("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "normal");

      tooltip.append("text")
        .attr("class", "overtime-hours")
        .attr("x", 15)
        .attr("dy", "3.6em")
        .style("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "normal");

      tooltip.append("text")
        .attr("class", "planned-hours")
        .attr("x", 15)
        .attr("dy", "4.8em")
        .style("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "normal");

      function updateToolTip(d) {
        var dayFormat = d3.timeFormat("%b-%d");
        var toolTipWeekOf = "Week of ";
        var toolTipRegTime = "Regular Time: ";
        var toolTipOvtTime = "Overtime: ";
        var toolTipPlannedHrs = "Planned Hours: ";

        var xPosition = d3.mouse(this)[0] - 15;
        var yPosition = d3.mouse(this)[1] - 55;
        tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
        tooltip.select("text.week-of").text(toolTipWeekOf + dayFormat(d3.timeMonday(d.StartDate)));
        tooltip.select("text.regular-hours").text(toolTipRegTime + d.ActualRegHrs);
        tooltip.select("text.overtime-hours").text(toolTipOvtTime + d.ActualOvtHrs);
        tooltip.select("text.planned-hours").text(toolTipPlannedHrs + d.PeriodHrs);
      }

    }
  }

};

// fetch csv file from library
function fetchCsvFile() {
  var siteUrl = _spPageContextInfo.siteAbsoluteUrl;
  var executor = new SP.RequestExecutor(siteUrl);
  var url = siteUrl + "/_api/web/GetFileByServerRelativeUrl('/accounting_/Accounting-Internal-Site/D3Data/planned_vs_actual_2020-03-17.csv')/$value";
  executor.executeAsync({
    url: url,
    method: "GET",
    headers: { "Accept": "application/json; odata=verbose" },
    success: successFetchCsv,
    error: errorFetchCsv
  });
}

function successFetchCsv(data) {
  var csvData = d3.csvParse(data.body, function (d) {
    return {
      Company: d.Company,
      StartDate: new Date(d.StartDate),
      EndDate: new Date(d.EndDate),
      Period: d.Period,
      Employee: d.Employee,
      EmployeeName: d.EmployeeName,
      TargetRatio: +d.TargetRatio,
      Project: d.Project,
      TargetHrs: +d.TargetHrs,
      PeriodHrs: +d.PeriodHrs,
      ActualRegHrs: +d.ActualRegHrs,
      ActualOvtHrs: +d.ActualOvtHrs,
      ProjectName: d.ProjectName,
      ChargeType: d.ChargeType,
      ProjectStatus: d.ProjectStatus,
      Org: d.Org,
      PracticeArea: d.PracticeArea,
      CA: d.CA,
      PM: d.PM,
      PIC: d.PIC,
      BD: d.BD,
      ProjectNumber: d.ProjectNumber,
      ScaleMaxHrs: +d.scale_maxhrs
    };
  });
  renderChart(csvData);
}

function errorFetchCsv(data) {
  console.log("Error retrieving CSV file from library.");
  console.log(data.body);
}

fetchCsvFile();