var icons = {"helicopter":'\uf533',"ship":'\uf21a'};
var hexRadius = 0;
var points = [];
var total_moves = 18;
var current_unit = 0;
var current_hex_column = 0;
var current_hex_row = 0;
var moving = false;

d3.queue()
    .defer(d3.csv,"data/hex_data.csv")
    .defer(d3.json,"data/test_data.json")
    .await(ready)
//most of this based on https://www.visualcinnamon.com/2013/07/self-organizing-maps-creating-hexagonal.html
function ready(error, data,ship_data){


  var colors = d3.scaleOrdinal().domain(["0","1","2","3","4"]).range(["#c6dbef","#fed976","#9ecae1","#6baed6","#4292c6"]);
  //select div

  var margin = 30;

  draw_hex_map();
  draw_unit_groups();

  function draw_unit_groups(){

    var chart_div = document.getElementById("test_ships");
    //set width and height.
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;//setting height as a proportion of width so we can control the layout better

    var icon_step = 120;

    if(d3.select(".ships_svg")._groups[0][0] == null){
      //draw svg to div height and width
      var svg = d3.select("#test_ships")
          .append("svg")
          .attr("class","ships_svg")
          .attr("width", width)
          .attr("height", height);

      var move_panel_width = 500
      var move_panel_x = width - margin - move_panel_width
      draw_move_panel(svg,move_panel_x,move_panel_width,height-(margin*2));
      d3.selectAll(".move_panel").attr("visibility","hidden");
    } else {
      var svg = d3.select(".ships_svg");
    };


    //now bind data and create group elements.
    //build  group
    var my_group = svg.selectAll(".unit_group").data(ship_data.units);
    //exit, remove
    my_group.exit().remove();

    //enter new groups
    var enter = my_group.enter().append("g").attr("class","unit_group")


    //append path to new group
    enter.append("rect").attr("class","unit_rect");
    enter.append("text").attr("class","unit_icon fa");
    enter.append("text").attr("class","unit_label");

    //merge and remove
    my_group = my_group.merge(enter);

    my_group.select(".unit_rect")
        .attr("width",80)
        .attr("height",60)
        .attr("x",function(d,i){return margin + 5 + (icon_step*i)})
        .attr("y",(height/2)-45)
        .attr("stroke","grey")
        .attr("fill","white")
        .attr("rx",3)
        .attr("ry",3)
        .on("mouseover",function(d){
          d3.selectAll(".unit_rect").attr("fill","white");
          d3.select(this).attr("fill","#F0F0F0");
        })
        .on("click", select_unit_icon)



    my_group.select(".unit_icon")
        .attr("id",function(d,i){return "panel_icon_" + i})
        .attr("pointer-events","none")
          .attr('font-size', '40px')
          .attr("opacity","0.8")
          .attr("fill",ship_data.Force_Colour)
          .text(d => icons[d.vessel_type])
          .attr("x",function(d,i){return margin + 20 + (icon_step*i)})
          .attr("y",(height/2));


    my_group.select(".unit_label")
        .attr("pointer-events","none")
        .attr("fill",ship_data.Force_Colour)
        .text(d => d.name)
        .attr("x",function(d,i){return margin + (icon_step*i) + 45})
        .attr("y",(height/2)+35)
        .attr("text-anchor","middle");


    var map_svg = d3.select(".hex_svg");

    var my_group = map_svg.selectAll(".unit_map_group").data(ship_data.units);
    //exit, remove
    my_group.exit().remove();

    //enter new groups
    var enter = my_group.enter().append("g").attr("class","unit_map_group")


    //append path to new group
    enter.append("text").attr("class","unit_map_icon fa");  //outline rect

    //merge and remove
    my_group = my_group.merge(enter);

    my_group.select(".unit_map_icon")
        .attr("pointer-events","none")
        .attr("id",function(d,i){return "map_icon_" + i})
        .attr('font-size', hexRadius + 'px')
        .attr("fill",ship_data.Force_Colour)
        .attr("opacity",0)
        .text(d => icons[d.vessel_type])
        .attr("x",function(d,i){
          var my_points = points.filter(f => f[5] == d.start_position);
          d.x = my_points[0][0];
          d.y = my_points[0][1] + (hexRadius/3);
          return d.x})
        .attr("y",d => d.y)
        .attr("transform","translate(" + margin + "," + margin + ")")

  };

  function select_unit_icon(d,i){
    //return state of all icons
    d3.selectAll(".unit_rect").attr("fill","white");
    d3.selectAll(".unit_icon").attr("fill","grey");
    d3.selectAll(".unit_map_icon").attr("fill",ship_data.Force_Colour).attr("opacity",0);
    //select current
    d3.select(this).attr("fill","#F0F0F0");
    d3.select("#panel_icon_" + i).attr("fill",ship_data.Force_Colour).attr("opacity",1);
    d3.select("#map_icon_" + i).attr("fill",ship_data.Force_Colour).attr("opacity",1);

    d3.select("#group_name").text(d.name);
    d3.select("#vessel_count").text(d.vessel_count);
    d3.select("#vessel_type").text(d.vessel_type);
    d3.select("#hex_speed").text(d.current_hex_speed)
    d3.select("#moves").text(d.total_moves + "/" + total_moves);

    d3.selectAll(".move_panel").attr("visibility","visible");
    d3.select("#hex_" + d.moves[0]).attr("fill","red").attr("opacity","0.2");
    current_unit = i;
    current_hex_column = +d.start_position.split("-")[0];
    current_hex_row = +d.start_position.split("-")[1];
    moving = true;
  }

  function draw_move_panel(svg,x,p_width,p_height){
    var step = 25;
    var x_step = 160;
    add_rect(svg,p_width,p_height,x,margin,"move_panel");
    add_text(svg,x+10,margin+step,"left","Group Name:","move_panel")
    add_text(svg,x+10,margin+(step*2),"left","No. of Vessels:","move_panel")
    add_text(svg,x+10,margin+(step*3),"left","Vessel Type:","move_panel")
    add_text(svg,x+10,margin+ (step*4),"left","Speed per Hex Move:","move_panel")
    add_text(svg,x+10+x_step,margin+step,"left","0","move_panel","group_name")
    add_text(svg,x+10+x_step,margin+(step*2),"left","0","move_panel","vessel_count")
    add_text(svg,x+10+x_step,margin+(step*3),"left","0","move_panel","vessel_type")
    add_text(svg,x+10+x_step,margin+ (step*4),"left","0","move_panel","hex_speed")

    add_rect(svg,80,25,x+p_width-90,p_height-5,"move_panel");
    add_text(svg,x+p_width-50,p_height+12.5,"middle","RESTART","move_panel")

    add_rect(svg,80,25,x+p_width-180,p_height-5,"move_panel");
    add_text(svg,x+p_width-140,p_height+12.5,"middle","SUBMIT","move_panel")

    add_rect(svg,120,25,x+p_width-310,p_height-5,"move_panel");
    add_text(svg,x+p_width-250,p_height+12.5,"middle","CHANGE SPEED","move_panel")

    add_text(svg,x+p_width-90,margin+65,"middle","0/" + total_moves,"move_panel","moves","70px")


  }
  function draw_hex_map(){

    var chart_div = document.getElementById("test_hex");
    //set width and height.
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;//setting height as a proportion of width so we can control the layout better

    if(d3.select(".hex_svg")._groups[0][0] == null){
      //draw svg to div height and width
      var svg = d3.select("#test_hex")
          .append("svg")
          .attr("class","hex_svg")
          .attr("width", width)
          .attr("height", height);

      var hex_group = svg.append("g").attr("class","hex_group");
    } else {
      var svg = d3.select(".hex_svg");
      var hex_group = d3.select(".hex_group");

    };

    data = filter_data(data);

    rows = d3.extent(data, d=> +d.row);
    columns = d3.extent(data,d => +d.column);

    // The maximum radius the hexagons can have to still fit the screen
    hexRadius = d3.min([width/((rows[1] + 0.5) * Math.sqrt(3)),
      height/((columns[1] + 1/3) * 1.5)]);

    //Calculate the center positions of each hexagon
    points = [];
    for (var i = 0; i < rows[1]; i++) {
      for (var j = 0; j < columns[1]; j++) {
        var is_data = data.filter(d => d.row == (i+1)  && d.column == (j+1));
        if(is_data.length > 0){
          points.push([hexRadius * j * 1.75, hexRadius * i * 1.5, is_data[0].type,  is_data[0].id,is_data[0].cell_center,i + "-" + j]);
        }
      }//for j
    }//for i

    //Set the hexagon radius
    var hexbin = d3.hexbin().radius(hexRadius);

    var my_data = hexbin(points);


    //Draw the hexagons
    hex_group.append("g")
        .selectAll(".hexagon")
        .data(my_data)
        .enter().append("path")
        .attr("class", "hexagon")
        .attr("id",d => "hex_" + d[0][5])
        .attr("d", function (d) {
          return "M" + d.x + "," + d.y + hexbin.hexagon();
        })
        .attr("stroke", "white")
        .attr("stroke-width", "1px")
        .attr("transform","translate(" + margin + "," + margin + ")")
        .attr("fill", function(d){return colors(+d[0][2])})
        .on("click",function(d){
          if(moving == true){
            var co_ords = this.id.split("_")[1]
            var this_column = +co_ords.split("-")[0];
            var this_row = +co_ords.split("-")[1];

            if(check_adjacent(this_row,this_column) === true){
              new_move(ship_data.units[current_unit],co_ords,this_column,this_row,this)
            } else {
              console.log('not adjacent')
            }

          }

        })

  }


};


function new_move(my_data,co_ords,column,row,my_object){

  var new_move_count = my_data.total_moves + my_data.current_hex_speed;
  if(new_move_count <= total_moves){
    d3.select(my_object).attr("fill","red").attr("opacity","0.2");
    my_data.moves.push(co_ords);
    current_hex_column = column;
    current_hex_row = row;
    my_data.total_moves += my_data.current_hex_speed;
    d3.select("#moves").text(my_data.total_moves + "/" + total_moves);
  }

}

function check_adjacent(row,column){

  var adjacent = true;

  if(row > (current_hex_row+1) | row < (current_hex_row-1)){
    adjacent = false;
  } else if (column > (current_hex_column+1) || column < (current_hex_column-1)){
    adjacent = false;
  }
  return adjacent;

}
function add_rect(my_svg,r_width,r_height,x,y,my_class){

  my_svg.append("rect")
      .attr("class",my_class)
      .attr("width",r_width)
      .attr("height",r_height)
      .attr("x",x)
      .attr("y",y)
      .attr("stroke","grey")
      .attr("fill","white")
      .attr("rx",3)
      .attr("ry",3)

}

function add_text(my_svg,x,y,anchor,my_text,my_class,my_id,font_size){

  if(font_size == undefined){
    font_size = "1em";
  }
  my_svg.append("text")
      .attr("class",my_class)
      .attr("id",my_id)
      .attr("text-anchor",anchor)
      .attr("x",x)
      .attr("y",y)
      .attr("font-size",font_size)
      .text(my_text)

}

function filter_data(data){

  var rows = d3.extent(data, d=> +d.row);
  var columns = d3.extent(data,d => +d.column);

  var row_difference = rows[0]-1;
  var column_difference = columns[0]-1;
  for(d in data){
    data[d].row -= row_difference;
    data[d].column  -= column_difference;
  };


  data = data.filter(d => d.column >= 10 && d.column <= 48);
  data = data.filter(d => d.row >= 10 && d.row <= 45);

  rows = d3.extent(data, d=> +d.row);
  columns = d3.extent(data,d => +d.column);

  var row_difference = rows[0]-1;
  var column_difference = columns[0]-1;
  for(d in data){
    data[d].row -= row_difference;
    data[d].column  -= column_difference;
  };
  return data;

}

