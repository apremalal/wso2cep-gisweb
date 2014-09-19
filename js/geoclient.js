var map, drawControls, select, polygonLayer, markerLayer, geojson, queryPolygonFeature, isConnectedToWS;

    $(document).ready(function(){  

	  	geoClient.init();       

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
        	geoClient.importStream(importStreamId,"in");
        });

        $("#addExportStream").click(function(){
        	exportStreamId = $("#exportstreamlistbtn").text();
        	exportStreamName = $("#exportStreamName").val();
        	$("#exportStreamDiv").show();
            geoClient.importStream(exportStreamId,"out");
        });

        $("#deleteImportStream").click(function(){
        	importStreamId = "";
        	importStreamName = "";
        	importStreamDefinitionAsString = "";
        	$("#importStreamDiv").hide();
        });

        $("#deleteExportStream").click(function(){
        	exportStreamId = "";
        	exportStreamName = "";
        	exportStreamDefinitionAsString = "";
        	$("#exportStreamDiv").hide();
        });
   });

geoClient = new function() {
	var consoleText = '';
	var ws;
	var polygon;
	var executionPlanList = new Object();
	var activeExecutionPlanName = '';
	var activeExecutionPlanConfigurationContent = '';

	/*Query builder params*/
	var importStreamId = '';
	var exportStreamId = '';
	var importStreamName = '';
	var exportStreamName = '';
	var importStreamDefinitionAsString = '';
	var exportStreamDefinitionAsString = '';

	this.init = function(){

		this.getAllActiveExecutionPlanConfigurations();

		$("#map").html('');
		$("#noneToggle").prop('checked', true);;
		$("#polygonToggle").prop('checked', false);
		
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
        
        polygonLayer = new OpenLayers.Layer.Vector("Polygon Layer", {
					    projection: "EPSG:4326"
					   });

        markerLayer = new OpenLayers.Layer.Vector("Overlay", {
        										   projection: "EPSG:4326",
					    						   styleMap: new OpenLayers.StyleMap({
													            externalGraphic: 'assets/img/marker-icon.png',
													            graphicWidth: 25, graphicHeight: 41, graphicYOffset: -24,
													            title: '${tooltip}'
													        })
					   	});

        
        map.addLayers([osmLayer, markerLayer, polygonLayer]);
	   
        map.addControl(new OpenLayers.Control.LayerSwitcher());
        map.addControl(new OpenLayers.Control.MousePosition());
     
        var options = {
                hover: true,
                onSelect: geoClient.serialize
            };

        drawControls = {
    	    polygon: new OpenLayers.Control.DrawFeature(polygonLayer,
                OpenLayers.Handler.Polygon)               
        };

 		polygonLayer.events.on({
		    featuresadded: onFeaturesAdded
		});

		function onFeaturesAdded(event){	
			if(!event.features[0].style){
				for(key in drawControls) {
				     var control = drawControls[key];
				     control.deactivate();
				 }
				$("#polygonToggle").prop('checked', false);
				geoClient.launchQueryBuilder();
			}
		}

        select = new OpenLayers.Control.SelectFeature(polygonLayer, options);
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
	}

	this.refreshPolygonLayer = function(){

		$("#noneToggle").prop('checked', true);;
		$("#polygonToggle").prop('checked', false);

		map.removeLayer(polygonLayer);
		select.deactivate();
		map.removeControl(select);		

		for(var key in drawControls) {
            map.removeControl(drawControls[key]);
            (drawControls[key]).deactivate();
        }        
        drawControls = {};

		polygonLayer = new OpenLayers.Layer.Vector("Polygon Layer", {
					    projection: "EPSG:4326"
					   });

		polygonLayer.events.on({
		    featuresadded: onFeaturesAdded
		});

		function onFeaturesAdded(event){	
			if(!event.features[0].style){
				for(key in drawControls) {
				     var control = drawControls[key];
				     control.deactivate();
				 }
				 $("#polygonToggle").prop('checked', false);
				geoClient.launchQueryBuilder();
			}		    
		}

		map.addLayer(polygonLayer);

		var options = {
                hover: true,
                onSelect: geoClient.serialize
            };

        drawControls = {
    	    polygon: new OpenLayers.Control.DrawFeature(polygonLayer,
                OpenLayers.Handler.Polygon)               
        };

       
		        
       select = new OpenLayers.Control.SelectFeature(polygonLayer, options);
       map.addControl(select);

       select.activate();

        for(var key in drawControls) {
            map.addControl(drawControls[key]);
        }

		/*removing the exisiting popups*/
        while( map.popups.length ) {
	         map.removePopup(map.popups[0]);
	    }

	    /*removing the marker layer*/
	    map.removeLayer(markerLayer);

	    markerLayer = new OpenLayers.Layer.Vector("Overlay", {
        										   projection: "EPSG:4326",
					    						   styleMap: new OpenLayers.StyleMap({
													            externalGraphic: 'assets/img/marker-icon.png',
													            graphicWidth: 25, graphicHeight: 41, graphicYOffset: -24,
													            title: '${tooltip}'
													        })
					   	});
	    map.addLayer(markerLayer);

        this.getAllActiveExecutionPlanConfigurations();
	}

	this.updateStreamId = function(streamId,inOrOut){
		if(inOrOut == "import"){
			importStreamId = streamId;			
		}else if(inOrOut == "export"){
			exportStreamId = streamId;
		}			
	}

	this.highlightQueryPolygon = function(name) {
		GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/", "action=getExecutionPlanPolygon&"+"name="+name,function(result) {
			var sitePoints = [];
			var siteStyle = {
				fillRule:"evenodd",
				fillColor:"red",
				fillOpacity:0.4,
				stroke:"blue",
				strokeOpacity:1,
				strokeWidth:2,
				strokeLinecap:"round",
				strokeLinejoin:"round",
				strokeDasharray:"none",
				pointerEvents:"visiblePainted"
			};

			var coordinates = JSON.parse(result.data[0].POLYGON);
			coordinates = coordinates.coordinates[0];
			var epsg4326 = new OpenLayers.Projection("EPSG:4326");
			for (var i in coordinates) {
			  var coord = coordinates[i];
			  var point = new OpenLayers.Geometry.Point(coord[0], coord[1]);
			  // transform from WGS 1984 to Spherical Mercator
			  point.transform(epsg4326, map.getProjectionObject());
			  sitePoints.push(point);
			}
			sitePoints.push(sitePoints[0]);

			var linearRing = new OpenLayers.Geometry.LinearRing(sitePoints);
			var geometry = new OpenLayers.Geometry.Polygon([linearRing]);

			if(queryPolygonFeature){
				polygonLayer.removeFeatures([queryPolygonFeature]);
			}

			queryPolygonFeature = new OpenLayers.Feature.Vector(geometry, null, siteStyle);
			polygonLayer.addFeatures([queryPolygonFeature]);
		});
	}

	this.getAllActiveExecutionPlanConfigurations = function() {
		GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/", "action=getAllActiveExecutionPlanConfigurations" ,function(result) {
			var executionNameListHtml = "";
			for(i = 0;i<result.queryNames.length;i++){
				var name = result.queryNames[i];
				executionNameListHtml += '<div class="btn-group" style="margin-top:5px;"><button type="button" class="btn btn-default" style="width:180px;" onClick="geoClient.highlightQueryPolygon(\''+ name +'\');return false;">'+ name +'</button><button type="button" class="btn btn-default" onClick="geoClient.showQueryInfo(\''+ name +'\');return false;"><i class="fa fa-info-circle"></i></button><button type="button" class="btn btn-default" onClick="geoClient.undeployExecutionPlan(\''+ name +'\');return false;"><i class="fa fa-times-circle-o"></i></button></div>';
			}
			$("#executoinList").html(executionNameListHtml);
		});
	}

	this.importStream = function(streamId,importOrExport){
		streamId = streamId.trim();
		if(streamId!="Import Stream" && streamId!="Export Stream"){
			GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/", "action=getStreamDefinitionAsString"+"&streamid="+streamId,function(result) {
			if(importOrExport == "import"){
				importStreamDefinitionAsString =  result.streamDefinition;	
				importStreamName = streamId.split(":");
				importStreamName = importStreamName[0];
				importStreamId = streamId;
			}else if(importOrExport == "export"){
				exportStreamDefinitionAsString =  result.streamDefinition;	
				exportStreamName = $("#exportStreamName").val();
				$("#exportStreamAlert").text("define stream "+exportStreamName+" ("+ exportStreamDefinitionAsString + ")");
			}			
			});
		}else{
			alert("please select a stream to import");
		}
		
	}

	this.launchQueryBuilder = function(){
		this.serialize();
		$("#planname").val('');
		$("#queryExpressoin").val('');
		if(polygon && polygon.features[0] && polygon.features[0].geometry){
			GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/","action=getAllEventStreamInfoDto",function(response) {
				var definitions = response.definitions;
				var importStreamListHtml = ""; 
				var exportStreamListHtml = "" ;
				for(i in definitions){
					var defObj = JSON.parse(definitions[i]);
					var streamId = defObj.name+':'+defObj.version
					importStreamListHtml += '<li><a href="#" onClick="geoClient.importStream(\''+streamId+'\',\'import\');return false;">'+streamId+'</a></li>';
				}
				$("#importStreamList").html(importStreamListHtml);
				$("#processmodal").modal();
			});
        }else{
        	this.alert("please draw a polygon before creating GEO cep query");
        }
	}

	this.showQueryInfo = function(name){
		this.serialize();
		GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/", "action=getActiveExecutionPlanConfigurations"+"&name="+name,function(response) {
			if(response.status = "success"){
				var queryHTML = '<strong>Query:</strong><br/>' + response.query
				$("#queryContent").html(queryHTML);
				$("#planNameInfo").val(response.name);
				$("#queryInfoModal").modal();
			}
			
		});
	}


	this.getStreamDefinitionAsString = function(streamId) {
		GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/", "action=getStreamDefinitionAsString"+"&streamid="+streamId,function(response) {
			return response.inputStreamDefinition;
		});
	}

	this.generateExecutionPlan = function() {
		var temp = $("#planname").val();
		temp = temp.replace(/ /g, "");
		var name = temp +'_geo_within';
		var featureLength = polygon.features.length;
		if(featureLength>0){
			var strPolygon = JSON.stringify(polygon.features[featureLength-1].geometry);
	    	strPolygon = strPolygon.replace(/"/g, "'");

	    	if(importStreamName){
	    		var query = 'from '+importStreamName+'[geo:iswithin(longitude,lattitude,"'+strPolygon+'")==true] select correlation_timeStamp,deviceId,lattitude,longitude, true as iswithin, \''+name+'\' as name insert into isWithinOutputStream; ';
			
				if ($("#negationQuery").is(":checked"))			{
				  query += 'from '+importStreamName+'[geo:iswithin(longitude,lattitude,"'+strPolygon+'")==false] select correlation_timeStamp,deviceId,lattitude,longitude, false as iswithin, \''+name+'\' as name insert into isWithinOutputStream;';
				}
				$("#queryExpressoin").val(query);
	    	}else
	    		this.alert("please choose an import stream");
	    	}else{
	    		this.alert("please draw a polygon");
	    	}		
		
	}

	this.deployExecutoinPlan = function() {
		var temp = $("#planname").val();
		temp = temp.replace(/ /g, "");
		var name = temp +'_geo_within';
		var queryExpressoin = $("#queryExpressoin").val();
		
		exportStreamName = "isWithinOutputStream";
		exportStreamId = "isWithinOutputStream:1.0.0";

		var featureLength = polygon.features.length;
		if(featureLength>0){
			var strPolygon = JSON.stringify(polygon.features[featureLength-1].geometry);
			GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/", "action=deployexecutionplan"+"&importstreamname="+importStreamName+"&importstreamid="+importStreamId+"&exportstreamname="+exportStreamName+"&exportstreamid="+exportStreamId+"&queryexpression="+queryExpressoin+"&name="+name+"&distributesprocessing="+false+"&timeoutinterval="+0+"&staticsenabled="+false+"&tracingenabled="+false+"&polygon="+strPolygon, function(result) {
				$("#processmodal").modal('hide');
				$("#alertText").text(result.message);
				$("#alertTitle").text(result.status);
				$("#alertmodal").modal();
				if(result.status == "success"){
					geoClient.getAllActiveExecutionPlanConfigurations();
					if(!isConnectedToWS){
						geoClient.connectToWS();
					}				
				}
			});
		}
	}

	this.undeployExecutionPlan = function(name){
		GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/", "action=undeployexecutionplan"+"&name="+name, function(result) {
			geoClient.getAllActiveExecutionPlanConfigurations();
			if(queryPolygonFeature){
				polygonLayer.removeFeatures([queryPolygonFeature]);
			}
		});
	}

	this.validateQuery = function() {
		var queryExpressoin = $("#queryExpressoin").val();
		if(importStreamDefinitionAsString!=""){
			var inputStreamDefinition = "define stream "+importStreamName+" ("+ importStreamDefinitionAsString + ")";
			GeoAppUtil.makeJSONRequest("POST","/geo-portal/geo/", "action=validatequery"+"&queryexpression="+queryExpressoin+"&inputstreamdefinition="+inputStreamDefinition,function(result) {
				if(result.status=="success"){
					alert("Query is Valid");
				}else{
					alert("There is something wrong with the query");
				}
			});
		}else
			this.alert("Please add an input stream");		
	}

	this.fetchAvailableExecutionList = function() {
		GeoAppUtil.makeXMLRequest("POST","/geo-portal/geo/", "action=getAllActiveExecutionPlanConfigurations",function(xml) {
			var executionNameListHtml='';
			$(xml).find("return").each(function()
			  {
				var cepExePlanName = $(this).find("name").text();
				executionNameListHtml += '<li><a href="#" onClick="geoClient.showGisCongiguration(\''+cepExePlanName+'\');return false;">'+cepExePlanName +'</a></li>';
				executionPlanList[cepExePlanName] = $(this).find("queryExpressions").text();
				consoleText += ">> Fetched exeplan :"+cepExePlanName+"\n"
				$("#console").text(consoleText);
			  });
			$("#executoinList").html(executionNameListHtml);				
		});
	}
	
	this.getActiveExecutionPlanConfigurationContent = function(cepExePlanName) {
		GeoAppUtil.makeXMLRequest("POST","/geo-portal/geo/", "action=getActiveExecutionPlanConfigurationContent"+"&exeplanname="+cepExePlanName,function(xml) {
			$(xml).find("return").each(function()
			  {
				activeExecutionPlanConfigurationContent = $(this).text();				
			  });
		});
	}

	this.toggleControl = function(element) {
		 for(key in drawControls) {
		     var control = drawControls[key];
		     if(element.value == key && element.checked) {
		         control.activate();
		         $("#alertTitle").text("Step 1");
		         $("#alertText").text("Draw a polygon to generate CEP queries.");
				 $("#alertmodal").modal();
		     } else {
		         control.deactivate();
		     }
		 }
	 }

	 this.toggelLink = function(){
	 	if(isConnectedToWS){
	 		this.disconnectFromWS();
	 	}else{
	 		this.connectToWS();
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

     this.pasteTemplate = function(){
    	var template = "from <inputstream>[geo:iswithin(<long>,<lat>,<polygon>)] select <params> insert into <outputstream>";
    	$("#queryExpressoin").val(template);
    }

    this.pastePolygon = function(){
    	var currentText = $("#queryExpressoin").val();
    	var strPolygon = JSON.stringify(polygon.features[0].geometry);
    	strPolygon = strPolygon.replace(/"/g, "'");
    	$("#queryExpressoin").val(currentText + strPolygon);
    }

	this.disconnectFromWS = function(){
		ws.close();
	}
     
	this.connectToWS = function(){
		var url = 'ws://localhost:9763/geo-portal/geo/websocket';
		ws = new WebSocket(url);
		ws.onopen = function() {
			$("#socketindicator").attr("src","assets/icons/green_indicator.png");
			$("#linkToggel").attr('class', 'fa  fa-unlink');
			consoleText += ">> Websocket opened.\n"
			$("#console").val(consoleText);
			isConnectedToWS = true;			
		};

		ws.onmessage = function(event){
			consoleText += ">> " + event.data + "\n"
			$("#console").val(consoleText);
			if(event.data){
				var geoPoint = JSON.parse(event.data);
				longitude = geoPoint.geometry.coordinates[0];
				lattitude = geoPoint.geometry.coordinates[1];
				var withinLocation = new OpenLayers.Geometry.Point(longitude, lattitude).transform('EPSG:4326', 'EPSG:900913');

			    markerLayer.addFeatures([
			        new OpenLayers.Feature.Vector(withinLocation, {tooltip: 'OpenLayers'})
			    ]); 

			    var popupLable = "lon :"+ longitude +"<br>lat :" + lattitude + "<br> iswithin : "+ geoPoint.properties.iswithin+ "<br> query name : "+ geoPoint.properties.name;
		        var popup = new OpenLayers.Popup.FramedCloud("Popup", withinLocation.getBounds().getCenterLonLat(), null,popupLable ,null,true);

		        /*removing the exisiting popups*/
		        while( map.popups.length ) {
			         map.removePopup(map.popups[0]);
			    }
	   			map.addPopup(popup);
			}
		};

		ws.onclose = function(){
			$("#socketindicator").attr("src","assets/icons/red_indicator.png");
			$("#linkToggel").attr('class', 'fa  fa-link');
			consoleText += ">> Websocket closed.\n"
			$("#console").val(consoleText);
			isConnectedToWS = false;
		};
		ws.onopen();
	}
	
	this.clearConsole = function(){
		consoleText = '';
		$("#console").val('');
	}

	this.alert = function(message){
		$("#alertTitle").text("Oops!");
		$("#alertText").text(message);
		$("#alertmodal").modal();
	}
}
