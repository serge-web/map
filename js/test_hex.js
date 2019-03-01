var icons = {"helicopter":'\uf533',"ship":'\uf21a'};
var hexRadius = 0;
var points = [];
var true_points = [];
var total_moves = 18;
var current_unit = 0;
var current_hex_column = 0;
var current_hex_row = 0;
var moving = false;
var current_colour = "";
var colors = d3.scaleOrdinal().domain(["0","1","2","3","4"]).range(["#c6dbef","#fed976","#9ecae1","#6baed6","#4292c6"]);
var margin = 30;
var current_speed_index = 0;

d3.queue()
    .defer(d3.csv,"data/hex_data.csv")
    .defer(d3.json,"data/test_data.json")
    .await(ready)

//most of this based on https://www.visualcinnamon.com/2013/07/self-organizing-maps-creating-hexagonal.html
function ready(error, data,ship_data) {

  current_colour = ship_data.Force_Colour;
  data = filter_data(data);
  draw_hex_map(data,ship_data);
  draw_unit_groups("test_ships",ship_data);

};
  function draw_unit_groups(div_id,ship_data){

    var chart_div = document.getElementById(div_id);
    //set width and height.
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;//setting height as a proportion of width so we can control the layout better

    var icon_step = 120;

    if(d3.select(".ships_svg")._groups[0][0] == null){
      //draw svg to div height and width
      var svg = d3.select("#" + div_id)
          .append("svg")
          .attr("class","ships_svg")
          .attr("width", width)
          .attr("height", height);

      var move_panel_width = 550;
      var move_panel_x = width - margin - move_panel_width
      draw_move_panel(svg,move_panel_x,move_panel_width,height-(margin*2));
      d3.selectAll(".move_panel").attr("visibility","hidden");
    } else {
      var svg = d3.select(".ships_svg");
    };

    //now bind data and create group elements.
    //build unit
    var my_group = svg.selectAll(".unit_group").data(ship_data.units);
    //exit, remove
    my_group.exit().remove();
    //enter new groups
    var enter = my_group.enter().append("g").attr("class","unit_group")
    //append rect, icon and label to new group
    enter.append("rect").attr("class","unit_rect");
    enter.append("text").attr("class","unit_icon fa");
    enter.append("text").attr("class","unit_label");
    //merge and remove
    my_group = my_group.merge(enter);
    //outline rectangle properties
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
    //icon properties
    my_group.select(".unit_icon")
        .attr("id",function(d,i){return "panel_icon_" + i})
        .attr("pointer-events","none")
          .attr('font-size', '40px')
          .attr("opacity","0.8")
          .attr("fill",ship_data.Force_Colour)
          .text(d => icons[d.vessel_type])
          .attr("x",function(d,i){return margin + 20 + (icon_step*i)})
          .attr("y",(height/2));
    //label properties
    my_group.select(".unit_label")
        .attr("pointer-events","none")
        .attr("fill",ship_data.Force_Colour)
        .text(d => d.name)
        .attr("x",function(d,i){return margin + (icon_step*i) + 45})
        .attr("y",(height/2)+35)
        .attr("text-anchor","middle");
    //select map svg
    var map_svg = d3.select(".hex_svg").select(".icon_group");
    //repeat for map units,
    var my_group = map_svg.selectAll(".unit_map_group").data(ship_data.units);
    //exit, remove
    my_group.exit().remove();
    //enter new groups
    var enter = my_group.enter().append("g").attr("class","unit_map_group")
    //append path and icon to new group
    enter.append("path").attr("class","unit_map_path")
    enter.append("text").attr("class","unit_map_icon fa");  //outline rect
    //merge and remove
    my_group = my_group.merge(enter);
    //path properties
    my_group.select(".unit_map_path")
            .attr("id",function(d,i){return "map_path_" + i})
            .attr("stroke",ship_data.Force_Colour)
            .attr("stroke-width","0.5px")
            .attr("fill","transparent")
            .attr("transform","translate(" + margin + "," + margin + ")")
    //icon properties
    my_group.select(".unit_map_icon")
        .attr("pointer-events","none")
        .attr("id",function(d,i){return "map_icon_" + i})
        .attr('font-size', hexRadius + 'px')
        .attr("fill",ship_data.Force_Colour)
        .attr("opacity",0)
        .text(d => icons[d.vessel_type])
        .attr("x",function(d,i){
          var my_points = get_points(d.start_position);
          d.x = my_points[0][0] - (hexRadius*0.75);
          d.y = my_points[0][1] + (hexRadius/3);
          return d.x})
        .attr("y",d => d.y)
        .attr("transform","translate(" + margin + "," + margin + ")")


    function draw_move_panel(svg,x,p_width,p_height){
      //draw individual elements of move panel
      var step = 20;
      var x_step = 160;
      //outline rect
      add_rect(svg,p_width,p_height,x,margin,"move_panel");
      //text on the left
      add_text(svg,x+10,margin+step,"left","Group Name:","move_panel")
      add_text(svg,x+10,margin+(step*2),"left","No. of Vessels:","move_panel")
      add_text(svg,x+10,margin+(step*3),"left","Vessel Type:","move_panel")
      add_text(svg,x+10,margin+ (step*4),"left","Current Speed:","move_panel")
      add_text(svg,x+10,margin+ (step*5),"left","Speed per Hex Move:","move_panel")
      add_text(svg,x+10+x_step,margin+step,"left","0","move_panel","group_name")
      add_text(svg,x+10+x_step,margin+(step*2),"left","0","move_panel","vessel_count")
      add_text(svg,x+10+x_step,margin+(step*3),"left","0","move_panel","vessel_type")
      add_text(svg,x+10+x_step,margin+ (step*4),"left","0","move_panel","speed")
      add_text(svg,x+10+x_step,margin+ (step*5),"left","0","move_panel","hex_speed")
      //buttons
      add_rect(svg,80,25,x+p_width-90,p_height-5,"move_panel","restart");
      add_text(svg,x+p_width-50,p_height+12.5,"middle","RESTART","move_panel","restart_text")

      add_rect(svg,80,25,x+p_width-180,p_height-5,"move_panel","submit");
      add_text(svg,x+p_width-140,p_height+12.5,"middle","SUBMIT","move_panel","submit_text")

      add_rect(svg,120,25,x+p_width-310,p_height-5,"move_panel","change_speed");
      add_text(svg,x+p_width-250,p_height+12.5,"middle","CHANGE SPEED","move_panel")
      //current move count
      add_text(svg,x+p_width-90,margin+65,"middle","0/" + total_moves,"move_panel","moves","70px")

      //set button functionality

      d3.select("#restart").on("click",function(d){
        d3.select("#submit_text").attr("opacity",1);
        //reset elements
        ship_data.units[current_unit].total_moves = 0;  //total moves
        ship_data.units[current_unit].submitted = false; //submitted
        d3.select("#panel_icon_" + current_unit).attr("fill",ship_data.Force_Colour).attr("opacity",1);  //panel icon
        d3.select("#map_icon_" + current_unit)  //map icon - appearance and position
            .attr("fill",ship_data.Force_Colour)
            .attr("opacity",1)
            .attr("x",function(d,i){
              var my_points = get_points(d.start_position);
              d.x = my_points[0][0]  - (hexRadius*0.75);
              d.y = my_points[0][1] + (hexRadius/3);
              return d.x})
            .attr("y",d => d.y);
        d3.select("#map_path_" + current_unit).attr("d","M0 0"); //map path
        d3.select("#moves").text("0/" + total_moves); //moves tex element
        ship_data.units[current_unit].moves = [ship_data.units[current_unit].moves[0]] //moves (start position only)
        current_hex_column = +ship_data.units[current_unit].start_position.split("-")[1]; //current hex column and row
        current_hex_row = +ship_data.units[current_unit].start_position.split("-")[0];
      })

      d3.select("#submit").on("click",function(d){
        //only allow if submitted is false.
        if(ship_data.units[current_unit].submitted == false){
          //set submitted to tru and change appearance of icons, paths and button
          ship_data.units[current_unit].submitted = true;
          d3.select("#map_path_" + current_unit).attr("stroke","purple");
          d3.select("#map_icon_" + current_unit).attr("fill","purple");
          d3.select("#panel_icon_" + current_unit).attr("fill","purple").attr("opacity",1);
          d3.select("#submit_text").attr("opacity",0.2);
        };
      })

      d3.select("#change_speed").on("click",function(d){
        var speeds_available = ship_data.units[current_unit].available_speeds;
        if(speeds_available.length > 1){
          current_speed_index += 1;
          if(current_speed_index == speeds_available.length){
            current_speed_index = 0;
          };
          ship_data.units[current_unit].current_speed = speeds_available[current_speed_index].speed;
          ship_data.units[current_unit].current_hex_speed = speeds_available[current_speed_index].hex_speed;
          d3.select("#speed").text(speeds_available[current_speed_index].speed);
          d3.select("#hex_speed").text(speeds_available[current_speed_index].hex_speed);
        }

      })

    }

    function select_unit_icon(d,i){
      //starts a group 'move' if not in the middle of one.
      if(ship_data.units[current_unit].total_moves > 0  && ship_data.units[current_unit].submitted === false){
        alert("You cannot switch groups until you've completed or cancelled your moves.")
      } else {
        //return state of all element
        d3.selectAll(".unit_rect").attr("fill","white");
        d3.selectAll(".unit_icon").attr("fill","grey");
        d3.selectAll(".unit_map_icon").attr("fill",ship_data.Force_Colour).attr("opacity",0);
        d3.selectAll(".unit_map_path").attr("opacity",0)
        d3.select("#submit_text").attr("opacity",1);
        //change colour/button state if already submitted.
        if(d.submitted == true){
          current_colour = "purple"
          d3.select("#submit_text").attr("opacity",0.2);
        }
        //set correct colour for icons and path
        d3.select("#panel_icon_" + i).attr("fill",current_colour).attr("opacity",1);
        d3.select("#map_icon_" + i).attr("fill",current_colour).attr("opacity",1);
        d3.select("#map_path_" + i).attr("opacity",1);
        //set values on move panel and make it visible
        d3.select("#group_name").text(d.name);
        d3.select("#vessel_count").text(d.vessel_count);
        d3.select("#vessel_type").text(d.vessel_type);
        d3.select("#speed").text(d.current_speed);
        d3.select("#hex_speed").text(d.current_hex_speed)
        d3.select("#moves").text(d.total_moves + "/" + total_moves);
        d3.selectAll(".move_panel").attr("visibility","visible");

        //set current unit, hex_column/row to starting position and moving to true
        current_unit = i;
        current_hex_column = +d.start_position.split("-")[1];
        current_hex_row = +d.start_position.split("-")[0];
        moving = true;
      }

    }
  };



  function draw_hex_map(data,ship_data){

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
      svg.append("g").attr("class","icon_group");
    } else {
      var hex_group = d3.select(".hex_group");
      d3.select(".icon_group");


    };

    rows = d3.extent(data, d=> +d.row);
    columns = d3.extent(data,d => +d.column);

    // The maximum radius the hexagons can have to still fit the screen
    hexRadius = d3.min([width/((columns[1] + 0.5) * Math.sqrt(3)),
      height/((rows[1] + 1/3) * 1.5)]);

    //Calculate the center positions of each hexagon
    points = [];
    for (var i = 0; i < rows[1]; i++) {
      for (var j = 0; j < columns[1]; j++) {
        var is_data = data.filter(d => d.row == (i+1)  && d.column == (j+1));
        if(is_data.length > 0){
          points.push([hexRadius * j * 1.75, hexRadius * i * 1.5, is_data[0].type,  is_data[0].id,is_data[0].cell_center,i + "-" + j]);
          var true_x = hexRadius * j * Math.sqrt(3)
          if(i%2 !== 0){
            true_x += hexRadius
          }
          true_points.push([true_x, hexRadius * i * 1.5,i + "-" + j]);
        }
      }//for j
    }//for i

    //Set the hexagon radius
    var hexbin = d3.hexbin().radius(hexRadius);

    var my_data = hexbin(points);


    //Draw the hexagons
    hex_group.append("g")
        .selectAll(".hexagon_group")
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
        .attr("fill", d => colors(+d[0][2]))
        .on("mouseover",function(d){
          if(moving == true){
            var co_ords = this.id.split("_")[1]
            var this_row = +co_ords.split("-")[0];
            var this_column = +co_ords.split("-")[1];

            if(check_adjacent(this_row,this_column) === true){
              d3.select(this).attr("fill","#F0F0F0")
            }
          }
        })
        .on("mouseout",function(d){
          d3.select(this).attr("fill",d => colors(+d[0][2]))
        })
        .on("click",function(d){
          if(moving == true){
            var co_ords = this.id.split("_")[1]
            var this_row = +co_ords.split("-")[0];
            var this_column = +co_ords.split("-")[1];

            if(check_adjacent(this_row,this_column) === true){
              new_move(ship_data.units[current_unit],co_ords,this_row,this_column,this)
            } else {
              console.log('not adjacent')
            }
          }
        })


  };


function get_points(start_position){
  return true_points.filter(f => f[2] == start_position);
}

function new_move(my_data,co_ords,row,column){

  var new_move_count = my_data.total_moves + my_data.current_hex_speed;
  if(new_move_count <= total_moves){
    my_data.moves.push(co_ords);

    var my_points = get_points(co_ords);

    d3.select("#map_icon_" + current_unit)
        .attr("fill",current_colour)
        .attr("opacity",1)
        .attr("x",my_points[0][0] - (hexRadius*0.75))
        .attr("y",my_points[0][1] + (hexRadius/3))

    reset_path(my_data.moves)
    current_hex_column = column;
    current_hex_row = row;
    my_data.total_moves += my_data.current_hex_speed;
    d3.select("#moves").text(my_data.total_moves + "/" + total_moves);
  }

}

function reset_path(moves){

  var new_path = "";

  for(m in moves){
    var current_moves = get_points(moves[m]);
    if(m == "0"){
      new_path = "M" + current_moves[0][0] + " " + current_moves[0][1]
    } else {
      new_path += " L" + current_moves[0][0] + " " + current_moves[0][1]
    }
  }
  d3.select("#map_path_" + current_unit)
      .attr("d",new_path)
}
function check_adjacent(row,column){

  var adjacent = true;

  if (row < (current_hex_row-1) || row > (current_hex_row+1)){
    adjacent = false;
  } else if(row == current_hex_row){
    if(column > (current_hex_column+1) || column < (current_hex_column-1)){
      adjacent = false;
    }
  } else {
    if((current_hex_row % 2) == 0){
      if(column < (current_hex_column-1) || column > (current_hex_column)){
        adjacent = false;
      }
    } else {
      if(column < current_hex_column || column > (current_hex_column+1)){
        adjacent = false;
      }
    }

  };



  return adjacent;

}
function add_rect(my_svg,r_width,r_height,x,y,my_class,my_id){

  my_svg.append("rect")
      .attr("class",my_class)
      .attr("id",my_id)
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
      .attr("pointer-events","none")
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

