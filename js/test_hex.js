
// fixed properties
var icons = {"helicopter":'\uf533',"ship":'\uf21a',"sub":'\uf578'};
var colors = d3.scaleOrdinal().domain(["0","1","2","3","4"]).range(["#c6dbef","#fed976","#9ecae1","#6baed6","#4292c6"]);
var total_moves = 18;
var margin = 30;
var icon_step = 120; //gap between icon 'panels' on ships svg
// properties populated when hex's are drawn
var hexRadius = 0;
var points = []; // used for d3.hexbin()
var true_points = []; // true centers - used by get_points()
var long_lats = {}; //
// populated in response to interaction.
var current_unit = 0;
var current_hex_column = 0;
var current_hex_row = 0;
var current_colour = "";
var current_speed_index = 0;
var current_ship_data = {};
var moving = false;
var my_animation;
var move_positions = {};
var paths = {};
var animation_units = [];
var counter = 0;  // used for animation, needs to be global for pause button to work (I think)
var map_view = "player";  //currently player or observer.
var zoom = d3.zoom().scaleExtent([1, 32]);


d3.queue()
    .defer(d3.csv,"data/hex_data.csv")
    .defer(d3.json,"data/test_data_white.json")
    .await(ready);

function ready(error, data,all_ship_data) {


  data = filter_data(data); // not a function to be proud of, but cuts down the map data.
  draw_zoom_svg("zoom_div");
  draw_hex_map(data);

  d3.selectAll(".view_type")
      .on("change",function(d){
          map_view = this.value;
          render_items();
      })
  d3.select("#cell_select")
      .on("change",function(){
        current_ship_data = all_ship_data.cells.filter(d => d.Force === this.value)[0];
        current_colour = current_ship_data.Force_Colour;
        current_unit = 0;
        current_speed_index = 0;
        initialise_player_items()
      })
      .selectAll('option')
      .data(all_ship_data.cells)
      .enter()
      .append('option')
      .text(d => d.Force);

  render_items();

    function render_items(){
        if(map_view === "player"){
            current_ship_data = all_ship_data.cells[0];
            current_colour = current_ship_data.Force_Colour;
            if(d3.select(".moves_svg")._groups[0][0] == null) {
                draw_unit_groups("test_ships");
                draw_moves_svg("moves_div");
            } else {
                d3.select(".moves_svg").style("visibility","visible");
                d3.select(".ships_svg").style("visibility","visible");
            }
            initialise_player_items()
        } else if(map_view === "observer"){
            d3.select(".moves_svg").style("visibility","hidden");
            d3.select(".ships_svg").selectAll(".unit_group").data([]).exit().remove();
            var my_units = [];
            for(c in all_ship_data.cells){
                for(u in all_ship_data.cells[c].units){
                    all_ship_data.cells[c].units[u].current_colour = all_ship_data.cells[c].Force_Colour;
                    my_units.push(all_ship_data.cells[c].units[u])
                }
            }
            initialise_map_icons(my_units);
            animation_units = my_units;
            replay_turn();
        }
        d3.select("#header_div")
            .style("visibility",function(d){
                if(map_view === "player"){
                    return "visible";
                } else {
                    return "hidden";
                }
            });
    }

}


// moves - just draw the svg
function draw_zoom_svg(div_id){

    var chart_div = document.getElementById(div_id);
    //set width and height.
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;//setting height as a proportion of width so we can control the layout better

    //draw svg to div height and width
   var svg = d3.select("#" + div_id)
        .append("svg")
        .attr("class","zoom_svg")
        .attr("width",width)
        .attr("height",height);

    add_rect(svg,80,25,10,(height/2)-12.5,"zoom_button","zoom_in");
    add_text(svg,50,(height/2) + 6,"middle","ZOOM IN","zoom_button","zoom_in_text");

    add_rect(svg,80,25,100,(height/2)-12.5,"zoom_button","zoom_out");
    add_text(svg,140,(height/2) + 6,"middle","ZOOM OUT","zoom_button","zoom_out_text");

    add_rect(svg,80,25,190,(height/2)-12.5,"zoom_button","refresh");
    add_text(svg,230,(height/2) + 6,"middle","REFRESH","zoom_button","refresh_text");

}
  // moves - just draw the svg
  function draw_moves_svg(div_id){

    var chart_div = document.getElementById(div_id);
    //set width and height.
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;//setting height as a proportion of width so we can control the layout better

      //draw svg to div height and width
      d3.select("#" + div_id)
          .append("svg")
          .attr("class","moves_svg")
          .attr("width",width)
          .attr("height",height);


  }
  // units - draw svg, move panel + submitted buttons, unit 'panels' (on move svg) and unit icon/path group combos (on hex svg)
  function draw_unit_groups(div_id){

    var chart_div = document.getElementById(div_id);
    //set width and height.
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;//setting height as a proportion of width so we can control the layout better

    var svg;

      //1. draw svg to div height and width
      svg = d3.select("#" + div_id)
          .append("svg")
          .attr("class","ships_svg")
          .attr("width",width)
          .attr("height",height);


      //2. draw move panel + submitted buttons
      var move_panel_width = 550;
      var move_panel_x = width - margin - move_panel_width;
      draw_move_panel(svg,move_panel_x,move_panel_width,height-(margin*2));
      d3.selectAll(".move_panel").attr("visibility","hidden");

      add_rect(svg,120,25,move_panel_x-130,height-(margin*2)-5,"submitted_buttons","replay");
      add_text(svg,move_panel_x-130+60,height-(margin*2)+12.5,"middle","REPLAY TURN","submitted_buttons","replay_text");

      add_rect(svg,120,25,move_panel_x-130,height-(margin*2)-35,"pause_button","pause");
      add_text(svg,move_panel_x-130+60,height-(margin*2)-17.5,"middle","PAUSE","pause_button","pause_text");

      add_rect(svg,120,25,move_panel_x-130,height-(margin*2)-65,"submitted_buttons","submit_moves");
      add_text(svg,move_panel_x-130+60,height-(margin*2)-47.5,"middle","SUBMIT MOVES","submitted_buttons","submit_moves_text");

      d3.selectAll(".pause_button").attr("visibility","hidden");

      d3.select("#pause").on("click",function(d){
          if(d3.select("#pause_text").text() == "PAUSE"){
              clearInterval(my_animation);
              d3.select("#pause_text").text("RESTART")
          } else {
              d3.select("#pause_text").text("PAUSE")
              my_animation = setInterval(play_animation, 400);

          }
      })

      d3.select("#replay").on("click",function(){
            animation_units = current_ship_data.units;
            replay_turn();
      });
      d3.selectAll(".submitted_buttons").attr("visibility","hidden");


    function draw_move_panel(svg,x,p_width,p_height){
      //draw individual elements of move panel
      var step = 20;
      var x_step = 160;
      //outline rect
      add_rect(svg,p_width,p_height,x,margin,"move_panel");
      //text on the left
      add_text(svg,x+10,margin+step,"left","Group Name:","move_panel");
      add_text(svg,x+10,margin+(step*2),"left","No. of Vessels:","move_panel");
      add_text(svg,x+10,margin+(step*3),"left","Vessel Type:","move_panel");
      add_text(svg,x+10,margin+ (step*4),"left","Current Speed:","move_panel");
      add_text(svg,x+10,margin+ (step*5),"left","Speed per Hex Move:","move_panel");
      add_text(svg,x+10+x_step,margin+step,"left","0","move_panel","group_name");
      add_text(svg,x+10+x_step,margin+(step*2),"left","0","move_panel","vessel_count");
      add_text(svg,x+10+x_step,margin+(step*3),"left","0","move_panel","vessel_type");
      add_text(svg,x+10+x_step,margin+ (step*4),"left","0","move_panel","speed");
      add_text(svg,x+10+x_step,margin+ (step*5),"left","0","move_panel","hex_speed");
      //buttons
      add_rect(svg,80,25,x+p_width-90,p_height-5,"move_panel","restart");
      add_text(svg,x+p_width-50,p_height+12.5,"middle","RESTART","move_panel","restart_text");

      add_rect(svg,80,25,x+p_width-180,p_height-5,"move_panel","submit");
      add_text(svg,x+p_width-140,p_height+12.5,"middle","SUBMIT","move_panel","submit_text");

      add_rect(svg,120,25,x+p_width-310,p_height-5,"move_panel","change_speed");
      add_text(svg,x+p_width-250,p_height+12.5,"middle","CHANGE SPEED","move_panel");
      //current move count
      add_text(svg,x+p_width-90,margin+65,"middle","0/" + total_moves,"move_panel","moves","70px");

      //set button functionality

      d3.select("#restart").on("click",function(){
        d3.select("#submit_text").attr("opacity",1);
        d3.selectAll(".submitted_buttons").attr("visibility","hidden");
        //reset elements
        current_ship_data.units[current_unit].total_moves = 0;  //total moves
        current_ship_data.units[current_unit].submitted = false; //submitted
        d3.select("#panel_icon_" + current_unit).attr("fill",current_colour).attr("opacity",1);  //panel icon
        d3.select("#map_icon_" + current_unit)  //map icon - appearance and position
            .attr("fill",current_colour)
            .attr("opacity",1)
            .attr("x",function(d){
              var my_points = get_points(d.moves[0].hex_reference);
              d.x = my_points[0][0]  - (hexRadius*0.75);
              d.y = my_points[0][1] + (hexRadius/3);
              return d.x})
            .attr("y",d => d.y);
        d3.selectAll("#map_path_group_" + current_unit + " path").attr("d","M0 0").attr("stroke",current_colour); //map path
        d3.select("#moves").text("0/" + total_moves); //moves tex element
        current_ship_data.units[current_unit].moves = [current_ship_data.units[current_unit].moves[0]]; //moves (start position only)
        draw_moves(current_ship_data.units[current_unit].moves);
        current_hex_column = +current_ship_data.units[current_unit].moves[0].hex_reference.split("-")[1]; //current hex column and row
        current_hex_row = +current_ship_data.units[current_unit].moves[0].hex_reference.split("-")[0];
      });

      d3.select("#submit").on("click",function(){
        //only allow if submitted is false.
        if(current_ship_data.units[current_unit].submitted === false){
          //set submitted to tru and change appearance of icons, paths and button
          current_ship_data.units[current_unit].submitted = true;
          d3.selectAll("#map_path_group_" + current_unit + " path");
          d3.select("#panel_icon_" + current_unit).attr("opacity",1);
          d3.select("#panel_label_" + current_unit);
          d3.select("#submit_text").attr("opacity",0.2);

          if(check_submitted() === true){
            d3.selectAll(".submitted_buttons").attr("visibility","visible");
            d3.selectAll(".unit_icon").attr("fill",current_colour);
              d3.selectAll(".move_panel").attr("visibility","hidden")
          }
        }
      });

      d3.select("#change_speed").on("click",function(){
        var speeds_available = current_ship_data.units[current_unit].available_speeds;
        if(speeds_available.length > 1){
          current_speed_index += 1;
          if(current_speed_index === speeds_available.length){
            current_speed_index = 0;
          }
          current_ship_data.units[current_unit].current_speed = speeds_available[current_speed_index].speed;
          current_ship_data.units[current_unit].current_hex_speed = speeds_available[current_speed_index].hex_speed;
          d3.select("#speed").text(speeds_available[current_speed_index].speed);
          d3.select("#hex_speed").text(speeds_available[current_speed_index].hex_speed);
          current_ship_data.units[current_unit].current_path_id += 1;
          d3.select("#map_path_group_" + current_unit)
              .append("path")
              .attr("id","map_path_" + current_ship_data.units[current_unit].current_path_id)
              .attr("stroke",current_colour);
        }

      })

    }

  }

  function check_submitted(){
      var all_submitted = current_ship_data.units.filter(d => d.submitted === true);

      if(all_submitted.length === current_ship_data.units.length){
          return true
      } else {
          return false
      }

  }



  function initialise_player_items(){

      if(check_submitted() === false){
          d3.selectAll(".submitted_buttons").attr("visibility","hidden");
      } else {
          d3.selectAll(".submitted_buttons").attr("visibility","visible");
      }
      d3.selectAll(".unit_icon").attr("fill",current_colour);
      d3.selectAll(".move_panel").attr("visibility","hidden");
      draw_moves([]);

    var svg = d3.select(".ships_svg");
    var height = +svg.attr("height");

    // 2. move panel icon, containing rectangle and labels
    var my_group,enter;
    //now bind data and create group elements.
    //build unit
    my_group = svg.selectAll(".unit_group").data(current_ship_data.units, d=> d.id);
    //exit, remove
    my_group.exit().remove();
    //enter new groups
    enter = my_group.enter().append("g").attr("class","unit_group");
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
        .on("mouseover",function(){
          d3.selectAll(".unit_rect").attr("fill","white");
          d3.select(this).attr("fill","#F0F0F0");
        })
        .on("click", function(d,i){
            current_unit = i;
            //change colour/button state if already submitted.
            if(d.submitted === true){
                d3.select("#submit_text").attr("opacity",0.2);
            }
            select_unit_icon();
        });
    //icon properties
    my_group.select(".unit_icon")
        .attr("id",function(d,i){return "panel_icon_" + i})
        .attr("pointer-events","none")
        .attr('font-size', '40px')
        .attr("opacity","0.8")
        .attr("fill",current_colour)
        .text(d => icons[d.vessel_type])
        .attr("x",function(d,i){return margin + 20 + (icon_step*i)})
        .attr("y",(height/2));
    //label properties
    my_group.select(".unit_label")
        .attr("id",function(d,i){return "panel_label_" + i})
        .attr("pointer-events","none")
        .attr("fill",current_colour)
        .text(d => d.name)
        .attr("x",function(d,i){return margin + (icon_step*i) + 45})
        .attr("y",(height/2)+35)
        .attr("text-anchor","middle");

    initialise_map_icons(current_ship_data.units)
  }

  function initialise_map_icons(my_data){
      // 3. hex svg icons and path groups
      var map_svg = d3.select(".hex_svg").select(".icon_group");
      //repeat for map units,
      my_group = map_svg.selectAll(".unit_map_group").data(my_data, d => d.id);
      //exit, remove
      my_group.exit().remove();
      //enter new groups
      enter = my_group.enter().append("g").attr("class","unit_map_group");
      //append path and icon to new group
      enter.append("g").attr("class","unit_map_path_group");
      enter.append("text").attr("class","unit_map_icon fa");  //outline rect
      //merge and remove
      my_group = my_group.merge(enter);
      //path properties
      my_group.select(".unit_map_path_group")
          .attr("id",function(d,i){return "map_path_group_" + i})
          .attr("transform","translate(" + margin + "," + margin + ")")
          .append("path")
          .attr("id","map_path_0")
          .attr("stroke",function(d){
              if(map_view === "player"){
                  return current_colour
              } else {
                  return d.current_colour;
              }
          });

      //icon properties
      my_group.select(".unit_map_icon")
          .attr("pointer-events","none")
          .attr("id",function(d,i){return "map_icon_" + i})
          .attr('font-size', hexRadius + 'px')
          .attr("fill",function(d){
              if(map_view === "player"){
                  return current_colour;
              } else {
                  return d.current_colour;
              }
          })
          .attr("opacity",function(d){
              if(map_view === "player"){
                  return 0
              } else {
                  return 1
              }
          })
          .text(d => icons[d.vessel_type])
          .attr("x",function(d){
              var my_points = get_points(d.moves[0].hex_reference);
              d.x = my_points[0][0] - (hexRadius*0.75);
              d.y = my_points[0][1] + (hexRadius/3);
              return d.x})
          .attr("y",d => d.y)
          .attr("transform","translate(" + margin + "," + margin + ")");

  }
function select_unit_icon(){
    //starts a group 'move' if not in the middle of one.
    if(current_ship_data.units[current_unit].total_moves > 0  && current_ship_data.units[current_unit].submitted === false){
        alert("You cannot switch groups until you've completed or cancelled your moves.")
    } else {
        //return state of all element
        d3.selectAll(".unit_rect").attr("fill","white");
        d3.selectAll(".unit_icon").attr("fill","grey");
        d3.selectAll(".unit_map_icon").attr("fill",current_colour).attr("opacity",0);
        d3.selectAll(".unit_map_path_group path").attr("opacity",0);
        d3.select("#submit_text").attr("opacity",1);
        draw_moves(current_ship_data.units[current_unit].moves);

        //set correct colour for icons and path
        d3.select("#panel_icon_" + current_unit).attr("fill",current_colour).attr("opacity",1);
        d3.select("#panel_label_" + current_unit).attr("fill",current_colour).attr("opacity",1);
        d3.select("#map_icon_" + current_unit).attr("fill",current_colour).attr("opacity",1);
        d3.selectAll("#map_path_group_" + current_unit + " path").attr("opacity",1);
        //set values on move panel and make it visible
        d3.select("#group_name").text(current_ship_data.units[current_unit].name);
        d3.select("#vessel_count").text(current_ship_data.units[current_unit].vessel_count);
        d3.select("#vessel_type").text(current_ship_data.units[current_unit].vessel_type);
        d3.select("#speed").text(current_ship_data.units[current_unit].current_speed);
        d3.select("#hex_speed").text(current_ship_data.units[current_unit].current_hex_speed);
        d3.select("#moves").text(current_ship_data.units[current_unit].total_moves + "/" + total_moves);
        d3.selectAll(".move_panel").attr("visibility","visible");

        //set current unit, hex_column/row to starting position and moving to true
        current_hex_column = +current_ship_data.units[current_unit].moves[0].hex_reference.split("-")[1];
        current_hex_row = +current_ship_data.units[current_unit].moves[0].hex_reference.split("-")[0];
        moving = true;
        if(current_ship_data.units[current_unit].submitted === true){
            draw_moves(current_ship_data.units[current_unit].moves)
        }
    }

}
  function draw_hex_map(data){

    var chart_div = document.getElementById("test_hex");
    //set width and height.
    var width = chart_div.clientWidth;
    var height = chart_div.clientHeight;//setting height as a proportion of width so we can control the layout better
    var hex_group;

    if(d3.select(".hex_svg")._groups[0][0] == null){

    zoom.translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

      //draw svg to div height and width
      var svg = d3.select("#test_hex")
          .append("svg")
          .attr("class","hex_svg")
          .attr("width",width)
          .attr("height",height)
          .call(zoom);


      var zoom_rect = svg.append("g");

      zoom_rect.append("rect")
          .attr("width",width)
          .attr("height",height)
          .attr("fill","#fff")

      hex_group = zoom_rect.append("g").attr("class","hex_group");
        zoom_rect.append("g").attr("class","icon_group")

      d3.selectAll(".zoom_button").on("click",zoom_click)


    } else {
      hex_group = d3.select(".hex_group");
      d3.select(".icon_group");
    }

    rows = d3.extent(data, d=> +d.row);
    columns = d3.extent(data,d => +d.column);

    var hex_width_max = width/((columns[1]*2)+2);
    var hex_height_max = height/((rows[1]*1.5)+3);
    // The maximum radius the hexagons can have to still fit the screen
    hexRadius = Math.min(hex_width_max,hex_height_max);

    //Calculate the center positions of each hexagon
    points = [];
    for (var i = 0; i < rows[1]; i++) {
      for (var j = 0; j < columns[1]; j++) {
        var is_data = data.filter(d => d.row === (i+1)  && d.column === (j+1));
        if(is_data.length > 0){
          points.push([hexRadius * j * 1.75, hexRadius * i * 1.5, is_data[0].type,  is_data[0].id,is_data[0].cell_center,i + "-" + j]);

          long_lats[i + "-" + j] = is_data[0].cell_center;
          var true_x = hexRadius * j * Math.sqrt(3);
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
        .on("mouseover",function(){
          if(moving === true){
            var co_ords = this.id.split("_")[1];
            var this_row = +co_ords.split("-")[0];
            var this_column = +co_ords.split("-")[1];

            if(check_adjacent(this_row,this_column) === true){
              d3.select(this).attr("fill","#74c476")
            } else {
              d3.select(this).attr("fill","#fb6a4a")
            }
          }
        })
        .on("mouseout",function(){
          d3.select(this).attr("fill",d => colors(+d[0][2]))
        })
        .on("click",function(){
          if(moving === true){
            var co_ords = this.id.split("_")[1];
            var this_row = +co_ords.split("-")[0];
            var this_column = +co_ords.split("-")[1];

            if(check_adjacent(this_row,this_column) === true){
              new_move(current_ship_data.units[current_unit],co_ords,this_row,this_column,this)
            } else {
              console.log('not adjacent')
            }
          }
        })

      function zoomed() {
          zoom_rect.attr("transform",d3.zoomTransform(this))

      };

      function zoom_click() {

          var zoom_multiplier = (this.id === 'zoom_in') ? 1.1 : 0.9;
          if(this.id === "refresh"){
              svg.call(zoom.transform, d3.zoomIdentity);
          } else {
              zoom.scaleBy(svg,zoom_multiplier)
          }


      };

   }

function replay_turn() {

   var changing = false;

  d3.selectAll(".unit_map_path_group path").attr("opacity", "0");
  d3.selectAll(".unit_map_icon").attr("opacity", "0");

  for (a in animation_units) {
    counter = 0;
    paths[a] = "";
    move_positions[a] = {};
    for (m in animation_units[a].moves) {
      var speed = animation_units[a].moves[m].hex_speed;
      for (i = 1; i <= speed; i++) {
        if (i === 1) {
          changing = true;
        } else {
          changing = false
        }
        move_positions[a][counter] = {
          icon_position: animation_units[a].moves[m].hex_reference,
          path_id: animation_units[a].moves[m].current_path_id,
          changing_path: changing,
            hex_speed: speed
        };
        counter += 1
      }
    }
  }

  counter = 0;

  my_animation = setInterval(play_animation, 400);


}

function play_animation() {
    if (counter === 0) {
        d3.selectAll(".unit_map_path_group path").attr("d", "").attr("opacity", "1");
        d3.selectAll(".unit_map_icon").attr("opacity", "1");
        d3.select("#moves").attr("visibility","visible").text("0/" + total_moves);
        d3.selectAll(".pause_button").attr("visibility","visible");
    }
    d3.select("#moves").text(counter + "/" + total_moves)
    for (a in animation_units) {
        if (move_positions[a][counter] !== undefined) {
            var co_ords = get_points(move_positions[a][counter].icon_position);
            d3.select("#map_icon_" + a)
                .attr("x", co_ords[0][0] - (hexRadius * 0.75))
                .attr("y", co_ords[0][1] + (hexRadius / 3));
            if (move_positions[a][counter].changing_path === true) {
                check_path_exists(a,counter,move_positions[a][counter].hex_speed);
                var path_string = d3.select("#map_path_group_" + a).select("#map_path_" + move_positions[a][counter].path_id).attr("d");

                if (path_string.includes("M") === false) {
                    if (move_positions[a][counter].path_id === 0) {
                        paths[a] += "M" + co_ords[0][0] + " " + co_ords[0][1];
                    } else {
                        var previous_co_ords = get_points(move_positions[a][counter - 1].icon_position);
                        paths[a] = " M " + previous_co_ords[0][0] + " " + previous_co_ords[0][1] + " L " + co_ords[0][0] + " " + co_ords[0][1];
                    }
                } else {
                    paths[a] += " L" + co_ords[0][0] + " " + co_ords[0][1]
                }
                d3.select("#map_path_group_" + a).select("#map_path_" + move_positions[a][counter].path_id).attr("d", paths[a]);
            }
        }
    }
    counter += 1;
    if (counter > total_moves) {
        d3.selectAll(".pause_button").attr("visibility","hidden");
        clearInterval(my_animation);
    }

    function check_path_exists(a,counter,hex_speed){
        var my_path = d3.select("#map_path_group_" + a).select("#map_path_" + move_positions[a][counter].path_id);
        if(my_path._groups[0][0] === undefined) {
            my_path = d3.select("#map_path_group_" + a)
                .append("path")
                .attr("id", "map_path_" + move_positions[a][counter].path_id)
                .attr("d", "")
                .attr("stroke",function(d){
                    if(map_view === "player"){
                        return current_colour
                    } else {
                        return d.current_colour;
                    }
                })
                .attr("stroke-dasharray", hex_speed + "," + hex_speed)
        }
        if(my_path.attr("stroke-dasharray") === null){
            my_path.attr("stroke-dasharray",hex_speed + "," + hex_speed)
        }

    }
}

  function draw_moves(moves){

    var moves_svg = d3.select(".moves_svg");
    //now bind data and create group elements.
    //build unit
    var my_group = moves_svg.selectAll(".moves_text_group").data(moves);
    //exit, remove
    my_group.exit().remove();
    //enter new groups
    enter = my_group.enter().append("g").attr("class","moves_text_group");
    //append rect, icon and label to new group
    enter.append("text").attr("class","moves_text");
    //merge and remove
    my_group = my_group.merge(enter);

    my_group.select(".moves_text")
            .attr("x",5)
            .attr("y",(d,i) => (20 * (+i)))
            .text(function(d,i){
              if(+i > 0){
                return i + ": " + d.hex_reference + " to " + d.hex_reference + " speed=" +  d.hex_speed
              }
    });
  }



function get_points(start_position){
  return true_points.filter(f => f[2] === start_position);
}

function new_move(my_data,co_ords,row,column){

  var new_move_count = my_data.total_moves + my_data.current_hex_speed;
  if(new_move_count <= total_moves){

    my_data.moves.push({"hex_reference":co_ords, "long_lat": long_lats[co_ords], "hex_speed": my_data.current_hex_speed, "hex_type": 1, "current_path_id": my_data.current_path_id});

    var my_points = get_points(co_ords);

    d3.select("#map_icon_" + current_unit)
        .attr("fill",current_colour)
        .attr("opacity",1)
        .attr("x",my_points[0][0] - (hexRadius*0.75))
        .attr("y",my_points[0][1] + (hexRadius/3));

    reset_path(my_data.moves,my_data.current_path_id);
    current_hex_column = column;
    current_hex_row = row;
    my_data.total_moves += my_data.current_hex_speed;

    draw_moves(my_data.moves);
    d3.select("#moves").text(my_data.total_moves + "/" + total_moves);
  } else {
    alert("You've reached your maximum moves.")
  }

}

function reset_path(moves,current_path_id){


  var new_path = "",current_move={},changing = false;

  for(m in moves){
    if(moves[m].current_path_id === current_path_id){
      if(current_path_id !== 0 && changing === true){
        var previous_moves = get_points(current_move.hex_reference);
        new_path = "M" + previous_moves[0][0] + " " + previous_moves[0][1];
        changing = false;
      }
      var current_moves = get_points(moves[m].hex_reference);
      if(m === "0"){
        new_path = "M" + current_moves[0][0] + " " + current_moves[0][1]
      } else {
        new_path += " L" + current_moves[0][0] + " " + current_moves[0][1]
      }
    } else {
      changing = true;
      current_move = moves[m];
    }
  }

  d3.select("#map_path_group_" + current_unit).select(" #map_path_" + current_path_id)
      .attr("stroke-dasharray",moves[m].hex_speed + "," + moves[m].hex_speed)
      .attr("d",new_path);
}
function check_adjacent(row,column){

  var adjacent = true;

  if (row < (current_hex_row-1) || row > (current_hex_row+1)){
    adjacent = false;
  } else if(row === current_hex_row){
    if(column > (current_hex_column+1) || column < (current_hex_column-1)){
      adjacent = false;
    }
  } else {
    if((current_hex_row % 2) === 0){
      if(column < (current_hex_column-1) || column > (current_hex_column)){
        adjacent = false;
      }
    } else {
      if(column < current_hex_column || column > (current_hex_column+1)){
        adjacent = false;
      }
    }

  }



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

  if(font_size === undefined){
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
  }


  data = data.filter(d => d.column >= 10 && d.column <= 45);
  data = data.filter(d => d.row >= 10 && d.row <= 50);

  rows = d3.extent(data, d=> +d.row);
  columns = d3.extent(data,d => +d.column);

  row_difference = rows[0]-1;
  column_difference = columns[0]-1;
  for(d in data){
    data[d].row -= row_difference;
    data[d].column  -= column_difference;
  }
  return data;

}

