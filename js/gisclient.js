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

        /* Changing dropdown connect on list item click */
		$(".dropdown-menu").on('click', 'li a', function(){
			var selText = $(this).text();
	  		$(this).parents('.btn-group').find('.dropdown-toggle').html(selText+' <span class="caret"></span>');
		});

        $("#importStreamDiv").hide();
        $("#exportStreamDiv").hide();

        $("#addImportStream").click(function(){
        	importStreamId = $("#importsreamlistbtn").text();
        	importStreamName = $("#importStreamName").val();
        	$("#importStreamDiv").show();
        	gisClient.importStream(importStreamId,"in");
        });

        $("#addExportStream").click(function(){
        	exportStreamId = $("#exportstreamlistbtn").text();
        	exportStreamName = $("#exportStreamName").val();
        	$("#exportStreamDiv").show();
            gisClient.importStream(exportStreamId,"out");
        });

        $("#deleteImportStream").click(function(){
        	importStreamId = "";
        	importStreamName = "";
        	$("#importStreamDiv").hide();
        });

        $("#deleteExportStream").click(function(){
        	exportStreamId = "";
        	exportStreamName = "";
        	$("#exportStreamDiv").hide();
        });

        $("#addExecutionPlan").click(function(){
        	gisClient.deployExecutoinPlan();
        });

        $("#connecttows").click(function(){
        	gisClient.connectToWS();
        });

        $("#disconnectfromws").click(function(){
        	gisClient.disconnectFromWS();
        })
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

	/*Query builder params*/
	var importStreamId = '';
	var exportStreamId = '';
	var importStreamName = '';
	var exportStreamName = '';
	var importStreamDefinitionAsString = '';
	var exportStreamDefinitionAsString = '';

	
	this.updateCEPConfigurations = function(){
		cepsocket = $("#cepsocket").val();
		cepusername = $("#cepusername").val();
		ceppassword =  $("#ceppassword").val();
		if(!cepsocket || !cepusername || !ceppassword)
			alert("Please enter cep configurations to perform the operation");
	}

	this.updateStreamId = function(streamId,inOrOut){
		if(inOrOut == "import"){
			importStreamId = streamId;			
		}else if(inOrOut == "export"){
			exportStreamId = streamId;
		}			
	}

	this.importStream = function(streamId,inOrOut){
		this.updateCEPConfigurations();
		GISAppUtil.makeJSONRequest("GET","/wso2cep-gisweb/gis/", "action=getStreamDefinitionAsString&cepsocket="+cepsocket+"&cepusername="+cepusername+"&ceppassword="+ceppassword+"&streamid="+streamId,function(result) {
			if(inOrOut == "in"){
				importStreamDefinitionAsString =  result.streamDefinition;	
				importStreamName = $("#importStreamName").val();			
				$("#importStreamAlert").text("define stream "+importStreamName+" ("+ importStreamDefinitionAsString + ")");
			}else if(inOrOut == "out"){
				exportStreamDefinitionAsString =  result.streamDefinition;	
				exportStreamName = $("#exportStreamName").val();
				$("#exportStreamAlert").text("define stream "+exportStreamName+" ("+ exportStreamDefinitionAsString + ")");
			}			
		});
	}

	this.launchQueryBuilder = function(){
		this.updateCEPConfigurations();
		if(polygon && polygon.features[0] && polygon.features[0].geometry){
			GISAppUtil.makeJSONRequest("GET","/wso2cep-gisweb/gis/", "action=getAllEventStreamInfoDto&cepsocket="+cepsocket+"&cepusername="+cepusername+"&ceppassword="+ceppassword,function(response) {
				var definitions = response.definitions;
				var importStreamListHtml = ""; 
				var exportStreamListHtml = "" ;
				for(i in definitions){
					var defObj = JSON.parse(definitions[i]);
					var streamId = defObj.name+':'+defObj.version
					importStreamListHtml += '<li><a href="#" onClick="gisClient.updateStreamId(\''+streamId+'\',\'import\');return false;">'+streamId+'</a></li>';
					exportStreamListHtml += '<li><a href="#" onClick="gisClient.updateStreamId(\''+streamId+'\',\'export\');return false;">'+streamId+'</a></li>';
				}
				$("#importStreamList").html(importStreamListHtml);
				$("#exportStreamList").html(exportStreamListHtml);
				$("#processmodal").modal();
			});
        }else{
        	alert("please draw a polygon to generate a GEO cep query");
        }
	}

	this.getAllEventStreamInfoDto = function() {
		this.updateCEPConfigurations();
		
	}

	this.getStreamDefinitionAsString = function(streamId){
		this.updateCEPConfigurations();
		GISAppUtil.makeJSONRequest("GET","/wso2cep-gisweb/gis/", "action=getStreamDefinitionAsString&cepsocket="+cepsocket+"&cepusername="+cepusername+"&ceppassword="+ceppassword+"&streamid="+streamId,function(result) {
			return result.inputStreamDefinition;
		});
	}

	this.deployExecutoinPlan = function() {
		this.updateCEPConfigurations();
		var name = $("#planname").val();
		var queryExpressoin = $("#queryExpressoin").val();
		GISAppUtil.makeJSONRequest("POST","/wso2cep-gisweb/gis/", "action=deployexecutionplan&cepsocket="+cepsocket+"&cepusername="+cepusername+"&ceppassword="+ceppassword+"&importstreamname="+importStreamName+"&importstreamid="+importStreamId+"&exportstreamname="+exportStreamName+"&exportstreamid="+exportStreamId+"&queryexpression="+queryExpressoin+"&name="+name+"&distributesprocessing="+false+"&timeoutinterval="+0+"&staticsenabled="+false+"&tracingenabled="+false, function(result) {
			alert(result);
		});
	}

	this.validateQuery = function() {
		this.updateCEPConfigurations();
		var queryExpressoin = $("#queryExpressoin").val();
		if(importStreamDefinitionAsString){
			var inputStreamDefinition = "define stream "+importStreamName+" ("+ importStreamDefinitionAsString + ")";
			GISAppUtil.makeJSONRequest("GET","/wso2cep-gisweb/gis/", "action=validatequery&cepsocket="+cepsocket+"&cepusername="+cepusername+"&ceppassword="+ceppassword+"&queryexpression="+queryExpressoin+"&inputstreamdefinition="+inputStreamDefinition,function(result) {
				if(result.status=="success"){
					alert("Query is Valid");
				}else{
					alert("There is something wrong with the query");
				}
			});
		}else
			alert("insert an input stream");		
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
				consoleText += ">> Fetched exeplan :"+cepExePlanName+"\n"
				$("#console").text(consoleText);
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

    this.pastePolygon = function()
    {
    	var currentText = $("#queryExpressoin").val();
    	var strPolygon = JSON.stringify(polygon.features[0].geometry);
    	strPolygon = strPolygon.replace(/"/g, "'");
    	$("#queryExpressoin").val(currentText + strPolygon);
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

	this.disconnectFromWS = function(){
		ws.close();
	}
     
	this.connectToWS = function(){
		var url = 'ws://10.100.5.106:9764/wso2cep-gisweb/gis/websocket';
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
		consoleText = '';
		$("#console").val('');
	}
}
