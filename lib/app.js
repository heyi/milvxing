'use strict';

var app = {
  controller: {},
  directive: {},
  serviceFactory: {},
  filter: {}
}; 
var _expire_time = 24 * 60 * 1000; 

var storage = {
  getItem: function (key) {
    if (!key || !sessionStorage[key]) { return null;  }
    var rs = sessionStorage[key].split("_"); 
    var val = rs[0], timestamp = rs[1], currentTimestamp = new Date().getTime(); 
    if (parseInt(timestamp, 10) + _expire_time > currentTimestamp) {
      this.setItem(key, val); 
      return val;  
    }else {
      sessionStorage.removeItem(key); 
      return null; 
    }
  },
  removeItem: function (key) {
    sessionStorage.removeItem(key); 
  }, 
  setItem: function (key, value) {
    var timestamp = new Date().getTime(); 
    sessionStorage[key] = value + "_" + timestamp;  
  }
}; 

app.directive.myTabs = function () {
  return {
    restrict: 'E',
    transclude: true,
    scope: {},
    controller: ["$scope", function($scope) {

      var panes = $scope.panes = [];
      $scope.select = function(pane) {
        angular.forEach(panes, function(pane) {
          pane.selected = false;
        });
        pane.selected = true;
      };

      this.addPane = function(pane) {
        if (panes.length === 0) {
          $scope.select(pane);
        }
        panes.push(pane);
      };
    }],
    templateUrl: 'template/my-tabs.html'
  };
};

app.directive.myPane = function () {
  return {
    require: '^myTabs',
    restrict: 'E',
    transclude: true,
    scope: {
      title: '@'
    },
    link: function(scope, element, attrs, tabsCtrl) {
      tabsCtrl.addPane(scope);
    },
    templateUrl: 'template/my-pane.html'
  }; 
};

app.directive.myBack = ["$window",  function ($window) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      element.on('click', function() {
        $window.history.back();
      });
    }
  }; 
}];


app.directive.myCollapse = function () {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      title: '@'
    },
    templateUrl: 'template/my-collapse.html'
  }; 
};

app.directive.myPin = function () {
  return {
    restrict: 'E',
    transclude: true,
    scope: { title: '@', icon: '@' },
    templateUrl: 'template/my-pin.html' 
  }; 
};

var iscrollOpts = {
  bounce: false, 
  preventDefault: false,
  snap: false
}; 

app.directive.myIscroll = function () {
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'template/my-iscroll.html', 
    link: function($scope, element, attrs) {
      var wrapper = element.children()[0];  
      var opts = angular.extend({}, iscrollOpts);  
      var is; 
      if (attrs.showAd) {
        var _top = document.querySelector("#_ad").getBoundingClientRect().top; 
        angular.extend(opts, {probeType: 3, mouseWheel: true }); 
        is = new IScroll(wrapper, opts);
        is.on('scroll', function () {
          if (-this.y  >= _top) {
            $scope.$apply( function () { $scope.ad = true; }); 
          }else {
            $scope.$apply( function () { $scope.ad = false; }); 
          }
        });
      }else {
        is = new IScroll(wrapper, opts);
      }
      $scope.$watch($scope.refreshName, function (newValue, oldValue) {
        setTimeout(function () {
          is.refresh();  
        }, 500); 
      }); 

      element.on('$destroy', function() {
        is.destroy(); 
      });
    }
  }; 
};


app.directive.rpattern = function () {
  return {
    restrict: "A",
    require: "ngModel",
    link: function(scope, el, attrs, ngModel) {
      var validator, patternValidator,
      pattern = attrs.rpattern,
      required = true;

      if( pattern ) {
        if (pattern.match(/^\/(.*)\/$/)) {
          pattern = new RegExp(pattern.substr(1, pattern.length - 2));
          patternValidator = function(value) {
            return validate(pattern, value); 
          }; 
        }
        else {
          patternValidator = function(value) {
            var patternObj = scope.$eval(pattern);
            if (!patternObj || !patternObj.test) {
              throw new Error('Expected ' + pattern + ' to be a RegExp but was ' + patternObj);
            }
            return validate(patternObj, value);
          };
        }
      }

      ngModel.$formatters.push(patternValidator);
      ngModel.$parsers.push(patternValidator);

      attrs.$observe("required", function(newval) {
        required = newval;
        patternValidator(ngModel.$viewValue);
      });

      function validate(regexp, value) {
        if( value === null || value === "" || !required || regexp.test(value) ) {
          ngModel.$setValidity('pattern', true);
          return value;
        }
        else {
          ngModel.$setValidity('pattern', false);
          return;
        }
      }
    }
  };  
}; 

app.directive.pullToRefresh = function ($timeout) {
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'template/pull-to-refresh.html', 
    link: function($scope, element, attrs) {
      var el = element[0]; 
      var pullDownEl = el.querySelector('#pullDown'),
      pullUpEl = el.querySelector('#pullUp');

      var wrapper = element.children()[0]; 
      var opts = angular.extend({}, iscrollOpts); 
      angular.extend(opts, { bounce: true, snap: false, preventDefault: true, probeType: 3, mouseWheel: false}); 

      var is = new IScroll(wrapper, opts),timeoutId;

      is.on("scrollEnd", function() {
        if (this.y === 0 && this.directionY === -1) {
          is._execEvent("pullToRefresh");
        }
        if (this.y === this.maxScrollY && this.directionY === 1) {
          is._execEvent("pullToMore");
        }
      });

      var scroller_height = is.scroller.offsetHeight;

      function scheduleUpdate() {
        timeoutId = $timeout(function() {
          if (scroller_height !== is.scroller.offsetHeight) {
            is.refresh();
            scroller_height = is.scroller.offsetHeight;
          }
          scheduleUpdate(); 
        }, 400);
      }

      is.on("pullToRefresh", function () {
        $scope.refreshFlag = true; 
        $scope.params["start"]  = 0; 
        $scope.query();  
      });
      is.on("pullToMore", function () {
        $scope.refreshFlag = false; 
        $scope.params["start"]  += $scope.params["limit"]; 
        $scope.query();  
      });

      element.on('$destroy', function() {
        is.destroy(); 
        $timeout.cancel(timeoutId);
      });

      $scope.$watch($scope.refreshName, function (newValue, oldValue) {
        if (!newValue || (newValue && newValue.length  == 0 ) || ($scope.refreshFlag  && newValue.length < 2)) {
          is.enabled = false; 
          pullDownEl.style.display ="none"; 
          pullUpEl.style.display ="none"; 
          if (newValue  && newValue.length  == 0) {
            $scope.warning = true; 
          }
        }else {
          is.enabled = true; 
          pullDownEl.style.display =""; 
          pullUpEl.style.display =""; 
          $scope.warning = false; 
        }
      });

      scheduleUpdate();
    }
  }; 
};

app.directive.myCalendar = [ "$q", function ($q) {
  return {
    restrict: 'E',
    templateUrl: 'template/my-calendar.html',
    link: function($scope, element, attrs) {
      var defered = $q.defer(); 
      var promise = defered.promise; 
      var _today = Date.today(); 
      var tbody = element[0].querySelector('tbody'), rs, min_day, max_day, min_first_day, max_last_day, days = {};  

      $scope.$watch('date', function (newValue, oldValue) {
        if (newValue !==  oldValue  &&  newValue.length >= 0) {
          defered.resolve(); 
        }
      });

      $scope.$watch('day', function (newValue, oldValue) {
        if (newValue !==  oldValue  ) {
          tbody.innerHTML = getCalendarBody(newValue) ; 
        }
      });

      $scope._prevMonth = function () {
        var tmp = $scope.day.clone().addMonths(-1); 
        if (tmp.compareTo(min_first_day) >= 0) {
          $scope.day = tmp; 
        }
      };

      $scope._nextMonth = function () {
        var tmp = $scope.day.clone().addMonths(+1); 
        if (tmp.compareTo(max_last_day) <= 0) {
          $scope.day = tmp; 
        }
      };

      promise.then(function () {
        rs = $scope.date;  
        if (rs.length == 0) {
          min_day = Date.today(); 
          max_day =  Date.today(); 
        }else {
          min_day = Date.parse(rs[0]["set_out_date"]); 
          max_day = Date.parse(rs[rs.length - 1]["set_out_date"]); 
        }
        min_first_day = min_day.clone().moveToFirstDayOfMonth(); 
        max_last_day = max_day.clone().moveToLastDayOfMonth(); 

        angular.forEach(rs, function (v, i) {
          days[v["set_out_date"]] = v; 
        });
        $scope.day = min_day; 
      });

      function getCalendarBody(dt) {
        if ( !dt || dt.compareTo(min_first_day) < 0 || dt.compareTo(max_last_day) > 0) { 
          return; 
        }
        var htmls = [], cls = '', key, attr = '', info ; 
        var dt =  dt || _today, fh = dt.clone().moveToFirstDayOfMonth(),lh = dt.clone().moveToLastDayOfMonth();    
        if (fh.is().sunday()  === false) {
          fh.moveToDayOfWeek(1, -1); 
        }
        if (lh.is().monday()  === false) {
          lh.moveToDayOfWeek(0); 
        }
        while(fh.compareTo(lh) <= 0 ) {
          htmls.push("<tr>"); 
          for(var i=0; i<7; i++) {
            key = fh.toString("yyyy-MM-dd"), info = days[key];  

            if (fh.compareTo(_today)  > 0) {
              cls = 'enable'; 
            }
            if (info) {
              cls = "selected";
              attr = JSON.stringify(info);  
              htmls.push("<td data-info=" + attr + " class=" + cls+ ">" + fh.toString("dd")  + "<span class='orange date-info'>￥" + info["trip_price"] + "</span></td>"); 
            }else {
              htmls.push("<td class=" + cls+ ">" + fh.toString("dd")  + "</td>"); 
            }
            fh.addDays(1); 
          }
          htmls.push("</tr>"); 
        }
        return htmls.join(""); 
      }

      element.on("click", function (e) {
        var el = e.target;  
        if (el.nodeName  == "SPAN") {
           el = el.parentNode;  
        }
        if (el.nodeName === "TD") {
          if (el.className  === "selected") {
            if (angular.isFunction($scope.go)) {
              var dt =  el.getAttribute("data-info");  
              $scope.$apply(function () {
                $scope.go(dt); 
              });
            }
          }
        }
      });
    }
  }; 
}];

app.directive.countDown = ["$timeout", function ($timeout) {
  return {
    restrict: 'A',
    scope: { endTime: '@' },
    link: function($scope, element, attrs) {
      var timeoutId;
      function updateTime() {
        if ($scope.endTime <= 0) {
          element.text("已过期") ; 
          return ; 
        }
        var seconds = $scope.endTime;
        var minutes = Math.floor(seconds/60);
        var hours   = Math.floor(minutes/60);
        var days    = Math.floor(hours/24);

        minutes = (minutes % 60);
        hours   = (hours % 24);
        seconds = (seconds % 60);

        if(seconds < 10)  seconds = '0'+seconds;
        if(minutes < 10)  minutes = '0'+minutes;
        if(hours < 10)  hours = '0'+hours;
        element.html("<span class='orange'>" + days + "</span>天<span class='orange'>" + hours + "</span>时<span class='orange'>" + minutes + "</span>分<span class='orange'>" + seconds + "</span>秒"); 
        $scope.endTime -= 1; 
      }

      function scheduleUpdate() {
        // save the timeoutId for canceling
        timeoutId = $timeout(function() {
          updateTime(); 
          scheduleUpdate(); 
        }, 1000);
      }

      element.on('$destroy', function() {
        $timeout.cancel(timeoutId);
      });
      scheduleUpdate(); 
    }
  }; 
}];

app.controller.orderDetailCtrl = ["$scope", "Restangular", "$routeParams", "$location",  function ($scope, Restangular, $routeParams, $location) {
  if (!storage.getItem("landed")  && !sessionStorage["tel"]) {
    $location.path("/products"); 
    return ; 
  }

  var rs = Restangular.one("user/details");
  $scope.refreshName = "admin"; 
  rs.get({order_id : $routeParams["orderId"]}).then(function (data) {
    $scope.user_info = data.user_info; 
    $scope.order = data.order_info; 
    $scope.admin = data.admin_info; 
  });
}]; 

app.controller.orderCtrl = ["$scope", "Restangular", "$routeParams", "$location", function ($scope, Restangular, $routeParams, $location) {
  var rs = Restangular.one("order/confirm");
  var rs2 = Restangular.all("order/save_order");
  
  $scope.order = {
    pro_id:$routeParams["pro_id"],
    trip_id:$routeParams["trip_id"],  
    product: {},
    passenger : [ { card_type : "护照", card_num : '', user_name : '', is_adult: 1 } ], 
    contact: {}, 
    adult_num: 1,  
    flatshare: "0", 
    child_num: 0, 
    room_num: 1
  }; 
  var man1 = { card_type : "护照", card_num : '', user_name : '', is_adult: 1 }; 
  var man2 = { card_type : "护照", card_num : '', user_name : '', is_adult: 0 }; 

  var min_adult , max_adult; 
  $scope.refreshName = "order.passenger"; 

  rs.get({ pro_id:$routeParams["pro_id"], trip_id:$routeParams["trip_id"] }).then(function (product) {
    $scope.order["product"] = product; 
    $scope.order["product"]["sum_price"] = product["trip_price"]; 
    min_adult = product.least; 
    max_adult = product.most; 
  });

  var changePassenger = function () {
     var tmp = []; 
     for (var i = 0, l = $scope.order.adult_num; i < l; i ++) {
       tmp.push(angular.copy(man1)); 
     }
     for (var i = 0, l = $scope.order.child_num; i < l; i ++) {
       tmp.push(angular.copy(man2)); 
     }
     $scope.order.passenger = tmp;  
  };

  $scope.submit_order = function () {
    rs2.post($scope.order).then(function (res) {
        $scope.status = res.status; 
        $scope.msg = res.msg; 
        if (res.status) {
          if (res.data.pay_type  == 1) {
            $location.path("/order-payment").search({order_id: res.data.order_id}); 
            return; 
          }
          if (res.data.pay_type  == 2) {
            $location.path("/order-success").search({order_id: res.data.order_id});; 
            return; 
          }
        }
    });
  };

  $scope.adjustRoom = function (num) {
    var tmp = num + $scope.order.room_num;  
    if (tmp  >= $scope.order.adult_num) {
      tmp = $scope.order.adult_num; 
    }

    if (tmp  <=  Math.ceil($scope.order.adult_num/2)) {
      tmp = Math.ceil($scope.order.adult_num/2); 
    }
    $scope.order.room_num = tmp; 
  };

  $scope.adjustMan = function (num, is_adult) {
    var tmp; 
    if (is_adult) {
      tmp = num + $scope.order.adult_num;
      if (tmp <= max_adult  &&  tmp  >=  min_adult) {
        $scope.order.adult_num = tmp; 
        changePassenger(); 
      }
    }else {
      tmp = num + $scope.order.child_num;  
      if (tmp  >= 1) {
        $scope.order.child_num =  tmp; 
        changePassenger(); 
      }
    }
    if ($scope.order.room_num <= Math.ceil($scope.order.adult_num/2)) {
      $scope.order.room_num = Math.ceil($scope.order.adult_num/2); 
    }

    if ($scope.order.room_num >=  $scope.order.adult_num) {
      $scope.order.room_num = $scope.order.adult_num; 
    }
  };
}];

app.controller.orderSuccessCtrl = ["$scope", "Restangular", "$routeParams", function ($scope, Restangular, $routeParams) {
  var rs = Restangular.one("order/submitted");
  var rs2; 
  $scope.refreshName = "order"; 
  rs.get({order_id:$routeParams.order_id}).then(function (order) {
    $scope.order = order; 
    rs2 = Restangular.all("../UMPay/umpay/order_id/" + order.order_id);
  });

  $scope.submit_order = function () {
    // var form1 = document.getElementById("order_form"); 
    // form1.action = "../UMPay/umpay/order_id/" + $scope.order.order_id; 
    // form1.submit(); 
    rs2.post().then(function (response) {
      if (response["status"]) {
        location.href = response["data"];
      }else {
        alert(response["msg"]); 
      }
    });
  };
}];

app.controller.baseCtrl = ["$scope", "Restangular", "$routeParams", "$location",  function ($scope, Restangular, $routeParams, $location) {
  if (!storage.getItem("landed")) {
    $location.path("/login"); 
    return ; 
  }
  var rs = Restangular.one("user/userinfo");
  $scope.refreshName = "user"; 
  rs.get().then(function (user) {
    $scope.user = user; 
  });
}];

app.controller.updateBaseCtrl = ["$scope", "Restangular", "$routeParams", "$location", function ($scope, Restangular, $routeParams, $location) {
  if (!storage.getItem("landed")) {
    $location.path("/login"); 
    return ; 
  }
  $scope.refreshName = "user"; 
  var rs = Restangular.one("user/userinfo");
  var rs2 = Restangular.all("user/updateUserinfo");

  rs.get().then(function (user) {
    $scope.user = user; 
  });

  $scope.update = function () {
    if ($scope.user.newpwd  == $scope.user.confirmpwd)
      rs2.post($scope.user).then(function (res) {
        $scope.status = res.status; 
        $scope.msg = res.msg; 
        if (res.status) {
          $location.path("/personal"); 
        }
      }); 
  };
}];

app.controller.findpassword1Ctrl = ["$scope", "Restangular", "$routeParams", "$location",  function ($scope, Restangular, $routeParams, $location) {
  var rs = Restangular.all("user/findpassword1");

  $scope.$watch("user.tel", function () {
    $scope.status = true; 
  });

  $scope.nextStep = function () {
    rs.post($scope.user).then(function (res) {
      $scope.status = res.status; 
      $scope.msg = res.msg; 
      if (res.status) {
        $location.search({tel: $scope.user.tel});
        $location.path("/findpassword2"); 
      }
    });  
  };
}];

app.controller.quickLoginCtrl = ["$scope", "Restangular", "$routeParams", "$location", function ($scope, Restangular, $routeParams, $location) {
  if (storage.getItem("landed")) {
    $location.path("/orders").search({order: 0}); 
    return false; 
  }
  var rs = Restangular.all("user/getLoginTel");
  var rs2 = Restangular.all("user/checkCode");

  $scope.$watch("user.tel", function () {
    $scope.status = true; 
  });

  $scope.queryForVerify = function () {
    rs.post($scope.user).then(function (res) {
      $scope.status = res.status; 
      $scope.msg = res.msg; 
      if (res.status) {
        $scope.valid = true; 
      }
    });  
  };

  $scope.query = function () {
    rs2.post($scope.user).then(function (res) {
      $scope.status = res.status; 
      $scope.msg = res.msg; 
      if (res.status) {
        $scope.valid = true; 
        sessionStorage["tel"] = true; 
        $location.path("/orders").search({order: 0}); 
      }
    });  
  };
}];

app.controller.calendarCtrl = ["$scope", "Restangular", "$routeParams", "$location",  function ($scope, Restangular, $routeParams, $location) {
  var rs = Restangular.one("index/calendar");
  $scope.refreshName = "date"; 
  rs.get({ id:$routeParams["id"] }).then(function (date) {
    $scope.date = date; 
  }); 

  $scope.go = function (dt) {
    dt = JSON.parse(dt); 
    $location.path("/order").search({pro_id: dt["pro_id"], trip_id:dt["trip_id"]}); 
  };
}];

app.controller.findpassword2Ctrl = ["$scope", "Restangular", "$routeParams", "$location", function ($scope, Restangular, $routeParams, $location) {
  var rs = Restangular.all("user/findpassword2");

  $scope.user = {tel:$routeParams.tel, pwd:'', verify: '' }; 

  $scope.$watch("user.verify", function () {
    $scope.status = true; 
  });

  $scope.getPwd = function () {
    rs.post($scope.user).then(function (res) {
      $scope.status = res.status; 
      $scope.msg = res.msg; 
      if (res.status) {
        $location.path("/login").search({tel: $scope.user.tel});
      }
    });  
  };
}];

app.controller.loginCtrl = ["$scope", "Restangular", "$routeParams", "$location", function ($scope, Restangular, $routeParams, $location) {
  if (storage.getItem("landed")) {
    $location.path("/personal"); 
    return false; 
  }
  var rs = Restangular.all("user/login");
  $scope.user = {username:$routeParams.tel, pwd:''}; 

  $scope.login = function () {
    rs.post($scope.user).then(function (res) {
      $scope.status = res.status; 
      $scope.msg = res.msg; 
      if (res.status) {
        $location.path("/personal"); 
        storage.setItem("landed", "yes") ; 
      }
    });  
  };
}];

app.controller.register2Ctrl =["$scope", "Restangular", "$routeParams", "$location",  function ($scope, Restangular, $routeParams, $location) {
  var rs = Restangular.all("user/register2");

  $scope.user = { pwd: '', tel:$routeParams.tel }; 

  $scope.$watch("user.pwd", function () {
    $scope.status = true; 
  });

  $scope.register = function () {
    rs.post($scope.user).then(function (res) {
      $scope.status = res.status; 
      $scope.msg = res.msg; 
      if (res.status) {
        $location.path("/personal"); 
        storage.setItem("landed", "yes") ; 
      }
    });  
  };
}];

app.controller.register1Ctrl = ["$scope", "Restangular", "$routeParams", "$location", function ($scope, Restangular, $routeParams, $location) {
  var rs = Restangular.all("user/register1");
  $scope.user = { tel: '' }; 

  $scope.$watch("user.tel", function () {
    $scope.status = true; 
  });

  $scope.nextStep = function () {
    rs.post($scope.user).then(function (res) {
      $scope.status = res.status; 
      $scope.msg = res.msg; 
      if (res.status) {
        $location.search({tel: $scope.user.tel});
        $location.path("/register2"); 
      }
    });  
  };
}];

app.controller.productCtrl = ["$scope", "Restangular", "$routeParams", "$location", "$window", function ($scope, Restangular, $routeParams, $location, $window) {
  var rs = Restangular.one("index/products");
  $scope.refreshName = "product"; 
  var title, site;
  rs.get({ id:$routeParams["id"] }).then(function (product) {
    $scope.product = product; 
    $scope.day = new Date(product.set_out_time * 1000); 
    title = product.pro_name + "  " + product.price + "起 (分享自 @爱旅行)";
    $scope.$parent.title =  title; 
    title = encodeURIComponent(title); 
    site = {
      "weibo" : "http://v.t.sina.com.cn/share/share.php?appkey=2939137657&url=" + url + "&title=" + title + "&pic=" + product.img, 
      "tqq" : "http://v.t.qq.com/share/share.php?url=" + url + "&title=" + title + "&pic=" + product.img, 
      "qq" : "http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=" + url + "&title=" + title, 
      "douban" : "http://www.douban.com/recommend/?url=" + url + "&title=" + title + "&image=" + product.img   
    }; 
  });

  $scope.ad = false;  
  $scope.slide = ''; 

  $scope.toCalendar = function () {
      $location.search({id: $scope.product.id});
      $location.path("/calendar");
  };
  var url = encodeURIComponent(window.location.href); 


  $scope.share = function (key) {
    var ls = site[key]; 
    $window.open(ls); 
  };
}];

app.controller.orderListCtrl = function ($scope, $location, $routeParams, Restangular) {
  if (!storage.getItem("landed")  && !sessionStorage["tel"]) {
    $location.path("/products"); 
    return ; 
  }
  var rs = Restangular.all("user/orderlist");
  if (!storage.getItem("landed")) {
    rs = Restangular.all("user/my_order");
  }
  $scope.go = function ( path ) { $location.path( path ); };
  var flag = $routeParams.order; 
  var header = "所有订单"; 
  if (flag  == 1) { header = "已付款"; }
  if (flag  == 2) { header = "未付款"; }
  $scope.header = header; 
  $scope.params = {order: flag,  start: 0, limit: 7}; 
  $scope.refreshFlag = true; 
  $scope.refreshName = "orders"; 

  $scope.query = function () {
    rs.getList($scope.params).then( function (orders) {
      if ($scope.refreshFlag) {
        $scope.orders = orders; 
      }else {
        if (orders.length) {
          $scope.orders = $scope.orders.concat(orders);  
        }
      }
    });
  };
  $scope.query(); 
};

app.controller.personalCtrl = function ($scope, $location, $routeParams, Restangular) {
  if (!storage.getItem("landed")) {
    $location.path("/login"); 
    return ; 
  }
  var rs = Restangular.one("user/logOut");
  $scope.cancel = function () {
    rs.post().then(function () {
      storage.removeItem("landed"); 
      $location.path("/products"); 
    });
  };
};

app.controller.myOrders = function ($scope, $location) {
  if (!storage.getItem("landed")  && !sessionStorage["tel"]) {
    $location.path("/products"); 
    return ; 
  }
};


app.controller.productListCtrl = ['$scope', 'Restangular', '$timeout', '$location',  function ($scope, Restangular, $timeout, $location) {
  var rs = Restangular.all("index/products");
  $scope.params = { start: 0, limit: 3, city: "北京" }; 
  $scope.head = "北京"; 
  var head = localStorage["head"]; 
  if (head) {
    $scope.head = head; 
    $scope.params["city"] = head; 
  }
  $scope.refreshFlag = true; 
  $scope.refreshName = "products"; 
  $scope.query = function () {
    rs.getList($scope.params).then( function (products) {
      if ($scope.refreshFlag) {
        $scope.products = products; 
      }else {
        if (products.length) {
          $scope.products = $scope.products.concat(products);  
        }
      }
    });
  };
  $scope.query(); 

  $scope.go = function ( path ) {
    $location.path( path );
  };

  $scope.head_to = ["北京", "天津", "上海", "杭州", "南京", "昆明", "广州", "海口", "哈尔滨"]; 

  //切换出发地
  $scope.queryForCity = function (h) {
    $scope.refreshFlag = true; 
    $scope.params["start"] = 0; 
    $scope.popover = false; 
    $scope.params["city"] = h; 
    $scope.params["key"] = ''; 

    $scope.head = h; 
    localStorage["head"] = h; 
    $scope.query(); 
  };

  $scope.queryForKey = function () {
    $scope.refreshFlag = true; 
    $scope.params["city"] = ''; 
    $scope.params["start"] = 0; 
    var timer =  $timeout(function () {
      $scope.slide = ''; 
      $scope.query(); 
      $timeout.cancel(timer); 
    }, 0);
  };
}]; 

app.controller.bankCtrl = ["$scope", "Restangular", "$routeParams", "$location", function ($scope) {
  $scope.banks = ["中国农业银行", "中国工商银行", "中国建设银行", "中国邮政储蓄银行", "中国银行", "招商银行", "交通银行", "浦发银行"];  
}];


var myapp = angular.module('app', ['ngRoute', 'ngTouch',  'restangular',  'ngAnimate', 'ngSanitize','angular-carousel' ]).
  controller(app.controller).
  directive(app.directive).
  filter('unsafe', function($sce) {
  return function(val) {
    return $sce.trustAsHtml(val);
  };}).
  factory(app.serviceFactory).config(function ($routeProvider, $locationProvider, RestangularProvider) {
  $routeProvider.
    when('/products', {
    templateUrl: 'partials/product-list.html',
    controller: 'productListCtrl'
  }).
    when('/products/:id', {
    templateUrl: 'partials/product-detail2.html', 
    controller: 'productCtrl'
  }).
    when('/banks', {
    templateUrl: 'partials/bank-list.html', 
    controller: 'bankCtrl'
  }).
    when('/set', {
    templateUrl: 'partials/set.html' 
  }).
    when('/set/about', {
    templateUrl: 'partials/about.html'
  }).
    when('/base', {
    templateUrl: 'partials/base.html', 
    controller: 'baseCtrl'
  }).
    when('/updateBase', {
    templateUrl: 'partials/update-base.html', 
    controller: 'updateBaseCtrl'
  }).
    when('/personal', {
    templateUrl: 'partials/personal-center.html',  
    controller: "personalCtrl"
  }).
    when('/set/myOrders', {
    templateUrl: 'partials/my-orders.html', 
    controller: "myOrders"
  }).
    when('/set/quickLogin', {
    templateUrl: 'partials/quick-login.html' , 
    controller: 'quickLoginCtrl'
  }).
    when('/login', {
    templateUrl: 'partials/login.html' , 
    controller: 'loginCtrl'
  }).
    when('/register1', {
    templateUrl: 'partials/register.html', 
    controller: "register1Ctrl"
  }).
    when('/register2', {
    templateUrl: 'partials/register2.html', 
    controller: "register2Ctrl"
  }).
    when('/findpassword1', {
    templateUrl: 'partials/find-password1.html' , 
    controller: "findpassword1Ctrl"
  }).
    when('/findpassword2', {
    templateUrl: 'partials/find-password2.html' , 
    controller: "findpassword2Ctrl"
  }).
    when('/calendar', {
    templateUrl: 'partials/calendar.html', 
    controller: "calendarCtrl"
  }).
    when('/orders', {
    templateUrl: 'partials/order-list.html', 
    controller: "orderListCtrl"
  }).
    when('/orders/:orderId', {
    templateUrl: 'partials/order-detail.html',  
    controller: "orderDetailCtrl"
  }).
    when('/order', {
    templateUrl: 'partials/place-order.html',  
    controller: "orderCtrl"
  }).
    when('/order-success', {
    templateUrl: 'partials/order-success.html',   
    controller: "orderSuccessCtrl"
  }).
    when('/order-payment', {
    templateUrl: 'partials/order-payment.html' , 
    controller: "orderSuccessCtrl"
  }).
    when('/order-payment-success', {
    templateUrl: 'partials/order-payment-success.html' , 
    controller: "orderSuccessCtrl"
  }).
    otherwise({
    redirectTo: '/products'
  });

  //restangular 基本配置
   RestangularProvider.setBaseUrl('http://m.ilvxing.com/');
   // RestangularProvider.setBaseUrl('/mobileapp/');
  // RestangularProvider.setBaseUrl('');
  // RestangularProvider.setRequestSuffix('.json');

  RestangularProvider.setResponseExtractor(function(response, operation, what, url) {
    document.getElementById("app_loading").style.display = 'none'; 
    if (operation  == "post") {
      return response;  
    }else {
      return response.data || [];
    }
  });

  RestangularProvider.setRequestInterceptor(function(element, operation, what, url) {
    document.getElementById("app_loading").style.display = 'block'; 
    return element; 
  });

  // set params for multiple methods at once
  //Restangular.setDefaultRequestParams(['remove', 'post'], {confirm: true});
  // set only for get method
  //Restangular.setDefaultRequestParams('get', {limit: 10});
  // or for all supported request methods
  //Restangular.setDefaultRequestParams({apikey: "secret key"});
}).run(['$rootScope', function ($rootScope) {
  $rootScope.title = "爱旅行，专注出境旅游特价，给你一次说走就走的旅行（www.ilvxing.com） "; 
  $rootScope.$on("$routeChangeStart", function (event, next, current) {
    storage.getItem("landed"); 
  });
}]); 
document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);

window.onbeforeunload = function (event) {
  if (location.hash.indexOf("order-payment") >=0 ) {
    return ; 
  }
  var dj = angular.injector(["app"]);
  dj.invoke(["Restangular", function(Restangular) {
    var rs = Restangular.one("user/logOut");
    rs.post().then(function () {
      storage.removeItem("landed"); 
    });
  }]);
  return "确定要离开吗?"; 
}

