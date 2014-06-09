var map, drawControls, polygonLayer, geojson;
    $(document).ready(function(){     
	map = new OpenLayers.Map('map',{
				projection: new OpenLayers.Projection("EPSG:4326"),
		   		displayProjection: new OpenLayers.Projection("EPSG:4326")			
			});
	   geojson = new OpenLayers.Format.GeoJSON({
		  'internalProjection': new OpenLayers.Projection("EPSG:900913"),
		  'externalProjection': new OpenLayers.Projection("EPSG:4326")
		});

		
       var osmLayer = new OpenLayers.Layer.OSM("OpenCycleMap",
	 ["http://a.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
	  "http://b.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png",
	  "http://c.tile.opencyclemap.org/cycle/${z}/${x}/${y}.png"]);
        
        polygonLayer = new OpenLayers.Layer.Vector("Polygon Layer");
       
        map.addLayers([osmLayer, polygonLayer]);
	   
        map.addControl(new OpenLayers.Control.LayerSwitcher());
        map.addControl(new OpenLayers.Control.MousePosition());

	   var options = {
                hover: true,
                onSelect: gisClient.serialize
            };

        drawControls = {
    	    polygon: new OpenLayers.Control.DrawFeature(polygonLayer,
                OpenLayers.Handler.Polygon)               
        };

      var select = new OpenLayers.Control.SelectFeature(polygonLayer, options);
       map.addControl(select);
       select.activate();

        for(var key in drawControls) {
            map.addControl(drawControls[key]);
        }
		
	   map.setCenter(
               new OpenLayers.LonLat(79.86, 6.915).transform(
                   new OpenLayers.Projection("EPSG:4326"),
                   map.getProjectionObject()
               ), 15
           	);  
        document.getElementById('noneToggle').checked = true;
	
   });

gisClient = new function() {
	var consoleText = '';
	var ws;
	var polygon;
	var executionPlanList = new Object();
	var activeExecutionPlanName = '';
	var activeExecutionPlanConfigurationContent = '';
	var cepsocket;
	var cepusername;
	var ceppassword;

	this.updateCEPConfigurations = function(){
		cepsocket = $("#cepsocket").val();
		cepusername = $("#cepusername").val();
		ceppassword =  $("#ceppassword").val();
	}

	this.fetchAvailableExecutionList = function() {
		this.updateCEPConfigurations();
		GISAppUtil.makeXMLRequest("GET","/wso2cep-gisweb/gis/", "action=getAllActiveExecutionPlanConfigurations&cepsocket="+cepsocket+"&cepusername="+cepusername+"&ceppassword="+ceppassword ,function(xml) {
			var executionNameListHtml='';
			$(xml).find("return").each(function()
			  {
				var cepExePlanName = $(this).find("name").text();
				executionNameListHtml += '<li><a href="#" onClick="gisClient.showGisCongiguration(\''+cepExePlanName+'\');return false;">'+cepExePlanName +'</a></li>';
				executionPlanList[cepExePlanName] = $(this).find("queryExpressions").text();
			  });
			$("#executoinList").html(executionNameListHtml);
		});
	}
	
	this.getActiveExecutionPlanConfigurationContent = function(cepExePlanName) {
		this.updateCEPConfigurations();
		GISAppUtil.makeXMLRequest("GET","/wso2cep-gisweb/gis/", "action=getActiveExecutionPlanConfigurationContent&cepsocket="+cepsocket+"&cepusername="+cepusername+"&ceppassword="+ceppassword+"&exeplanname="+cepExePlanName,function(xml) {
			$(xml).find("return").each(function()
			  {
				activeExecutionPlanConfigurationContent = $(this).text();
				$("#console").text(activeExecutionPlanConfigurationContent);
			  });
		});
	}
	
	this.editActiveExecutionPlanConfiguration = function(configuration) {
		this.updateCEPConfigurations();
		GISAppUtil.makeXMLRequest("GET","/wso2cep-gisweb/gis/", "action=editActiveExecutionPlanConfiguration&cepsocket="+cepsocket+"&cepusername="+cepusername+"&ceppassword="+ceppassword+"&configplancontent="+activeExecutionPlanConfigurationContent+"&exeplanname="+activeExecutionPlanName,function(xml) {
			
		});
	}

	this.showGisCongiguration = function(cepExePlanName)
	{
		activeExecutionPlanName = cepExePlanName;
		$("#exeplantxtarea").text(executionPlanList[cepExePlanName]);			
		this.getActiveExecutionPlanConfigurationContent(activeExecutionPlanName);
	}


	this.toggleControl = function(element) {
		 for(key in drawControls) {
		     var control = drawControls[key];
		     if(element.value == key && element.checked) {
		         control.activate();
		     } else {
		         control.deactivate();
		     }
		 }
	  }
		
	this.serialize = function() {
		    var str = geojson.write(polygonLayer.features, true);
		    polygon = JSON.parse(str);
		    $("#polygon").text(str);
     }

	this.allowPan = function(element) {
           var stop = !element.checked;
           for(var key in drawControls) {
               drawControls[key].handler.stopDown = stop;
               drawControls[key].handler.stopUp = stop;
           }
     }

	this.updateExeAndConnectToCEP = function(){
		this.serialize();
		if(polygon && polygon.features[0] && polygon.features[0].geometry){
			temp1 = activeExecutionPlanConfigurationContent.match(new RegExp("(gis:iswithin\\()(\\w*),(\".*\")"));
			editedPlan = temp1[0].replace(/(\".*\")/,"\""+JSON.stringify(polygon.features[0].geometry).replace(new RegExp("\"", 'g'),"'")+"\"");
			activeExecutionPlanConfigurationContent = activeExecutionPlanConfigurationContent.replace(new RegExp("(gis:iswithin\\()(\\w*),(\".*\")"),editedPlan);
			activeExecutionPlanConfigurationContent = activeExecutionPlanConfigurationContent.replace("<![CDATA[", "").replace("]]>", "");
			this.editActiveExecutionPlanConfiguration();
			this.connectToWebsocket();
		}else{
			alert("draw a apolygon before anlyzing");
		}
	}

	this.disconnectFromCEP = function(){
		ws.close();
	}
     
	this.connectToWebsocket = function(){
		var url = 'ws://localhost:9764/wso2cep-gisweb/gis/websocket';
		ws = new WebSocket(url);
		ws.onopen = function() {
			$("#socketindicator").attr("src","assets/icons/green_indicator.png");
			consoleText += ">> Websocket opened.\n"
			$("#console").val(consoleText);
		};

		//event handler for the message event in the case of text frames
		ws.onmessage = function(event) {
			consoleText += ">> " + event.data + "\n"
			$("#console").val(consoleText);
		};

		ws.onclose = function() {
			$("#socketindicator").attr("src","assets/icons/red_indicator.png");
			consoleText += ">> Websocket closed.\n"
			$("#console").val(consoleText);
		};
		ws.onopen();
	}
	
	this.clearConsole = function(){
		$("#console").text('');
	}
}
