GeoAppUtil = new function() { 
    this.makeXMLRequest = function(type, u, d, callback) {
        $.ajax({
            type: type,
            url: u,
            data: d,
            dataType: "xml",
            success: callback,
            beforeSend: function (xhr) {
                xhr.setRequestHeader ("Authorization",  "Basic " + btoa("admin" + ":" + "admin"));
            }
        });
    };

    this.makeJSONRequest = function(type, u, d, callback) {
        $.ajax({
            type: type,
            url: u,
            data: d,
            dataType: "json",
            success: callback,
            beforeSend: function (xhr) {
                xhr.setRequestHeader ("Authorization",  "Basic " + btoa("admin" + ":" + "admin"));
            }
        });
    };
}


