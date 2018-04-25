const base_dashboard_url = 'http://192.168.0.94/superset/dashboard_json/'
const base_slice_url = 'http://192.168.0.94/superset/explore_json/table/'
// const base_dashboard_url = 'http://192.168.0.186:8088/superset/dashboard_json/'
// const base_slice_url = 'http://192.168.0.186:8088/superset/explore_json/table/'
const base_echart_form_url = 'http://192.168.0.94/echart_form/'
const echart_css_api = 'http://192.168.0.94/save_dash_css/'
const fav_url = 'http://192.168.0.94/superset/favstar/Dashboard/'
const dashboard_title_id = '#dashboard_title'
const dashboard_content_id = '#data_dash'

const slice_height_unit = 110

//echart 图表参数 - 统一风格
const text_color = "#fff"
const background_color = "#333"
const colors = ['#fad797', '#59ccf7', '#c3b4df']

//echart风格 - 背景图片地址
dark_background_url = 'http://7xrw4h.com1.z0.glb.clouddn.com/static/images/dark_backgroud.jpg'
vintage_background_url = 'http://7xrw4h.com1.z0.glb.clouddn.com/static/images/vintage_backgroud.png'


var echart_dict = {} //存放echart实例

//TODO: 拆分一下不同参数
const current_url = decodeURI(window.location.href)

var verbose_map //存放列名的别名

//时间粒度
const time_grain = [
    ['second', '每秒'],
    ['minute', '每分钟'],
    ['5 minute', '每5分钟'],
    ['half hour', '每半小时'],
    ['hour', '每小时'],
    ['day', '每天'],
    ['week', '每周'],
    ['month', '每月'],
    ['quarter', '每季度'],
    ['year', '每年']
]


var filter_paramets = []
var filter_form = {}
var time_filter = {}
var fravstar_action = 'count' //初始化判断是否已经收藏
//排序函数
function sortNumber(a, b) {
    return a - b
}

//收藏
function fravstar(object_id) {
    $.get(fav_url + object_id + '/' + fravstar_action).done(function (response) {
        if (fravstar_action == 'select') {
            alert('收藏成功')
            $('#fravstar').removeClass("glyphicon-heart-empty").addClass('glyphicon-heart')
            fravstar_action = 'unselect'
        } else if (fravstar_action == 'unselect') {
            alert('取消收藏成功')
            fravstar_action = 'select'
            $('#fravstar').removeClass("glyphicon-heart").addClass('glyphicon-heart-empty')
        } else {
            //初始化，看是否已经收藏
            if (response.count == 0) {
                fravstar_action = 'select'
            } else {
                $('#fravstar').removeClass("glyphicon-heart-empty").addClass('glyphicon-heart')
                fravstar_action = 'unselect'
            }
        }
    })

}

if (current_url.indexOf('?') > -1) {
    var paramets = current_url.split('?')[1].split('&')
    paramets.forEach(function (val, index, arr) {
        var v = val.split('=')

        if (v[1] !== '') {

            //不是时间参数,暂时单选
            //TODO: 多选
            if (v[0] !== 'since' && v[0] !== 'until' && v[0] !== 'time_grain_sqla') {
                filter_paramets.push({
                    col: v[0],
                    op: "in",
                    val: [v[1]]
                })
                filter_form[v[0]] = v[1]
            } else {
                //时间参数
                //console.log('time filter', v)
                time_filter[v[0]] = v[1]
            }
        }

    })
}

function read_dashboard(dashboard_id, force_refresh = false, interval = 0) {
    var get_dashboat_url
    var slice_width_unit = Math.floor(document.documentElement.clientWidth / 12) - 1
    //请求数据
    $.get(base_dashboard_url + dashboard_id).done(function (response) {
        // 先拿这个图表的参数
        console.log(response)
        //初始化
        $(dashboard_title_id).children().remove()

        //访问禁止
        if (response.dashboard == undefined) {
          alert("没有权限访问，请联系管理员"); 
          window.location.href="/superset/welcome"
          return
        }
        //权限问题提醒
        if (response.dashboard.status == 401) {
            $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">' + response.dashboard.message + '<a href="/superset/welcome"> 返回首页</a></div>')
            return
        }

        //其他错误
        if (response.dashboard.status !== undefined) {
            $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">数据加载失败</div>')
            return
        }

        //设置样式，添加logo
        let logo = response.dashboard.metadata.logo;

        if (!(JSON.stringify(logo) == "{}")) {
            $(dashboard_title_id).append(`<div class="logo" id="logo"><a href = "javascript:void(0);">
            <img src="${logo.src}" alt="${logo.name}" width='${logo.width}px' height="${logo.height}" title="${logo.name}"></a></div>`)
        }
        //标题
        $(dashboard_title_id).append(`<h2 style="${!(JSON.stringify(logo) == "{}")?`margin-left:${logo.width + 20}px `:'margin-left:10px'}">${response.dashboard.dashboard_title}
        <span class="glyphicon glyphicon-heart-empty" style='font-size:20px' aria-hidden="true" id="fravstar" onclick="fravstar(${response.dashboard.id})"></span>
        <div class="button_menu" id="button_menu"></div>
        <div class="pull-right" id="control_menu"></div></h2>`)

        //下拉选择切换看板
        if (response.dashboard.metadata.button) {
            let buttonArr = response.dashboard.metadata.button;
            for (let i = 0; i < buttonArr.length; i++) {
                var html = '';
                html = `<div class="dropdown">
            <button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu${i}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                ${buttonArr[i].label}<span class="caret"></span>
            </button>
            <ul class="dropdown-menu menu${i}" aria-labelledby="dropdownMenu${i}"></ul>
            </div>`
                $("#button_menu").append(html)
                for (let j = 0; j < buttonArr[i].children.length; j++) {
                    $(`#button_menu .dropdown .menu${i}`).append(`<li><a href="${base_echart_form_url}${buttonArr[i].children[j].dashboard_id}" target="_blank" >${buttonArr[i].children[j].label}</a></li>`);
                }
            }
        }

        //右边控制工具
        //设置css主题样式
        $('#control_menu').append('<button type="button" class="btn btn-default" data-toggle="modal" data-target="#CssModal" id="change_css"><span class="glyphicon glyphicon-asterisk" aria-hidden="true"></span></button>')

        //TODO: 添加权限显示
        //强制新的刷新, 清除echart

        $('#control_menu').append('<button type="button" class="btn btn-default" id="force_refresh" onclick="read_dashboard(' +
            response.dashboard.id + ',force_refresh=true)"><span class="glyphicon glyphicon-refresh" aria-hidden="true"></span></button>')

        // 点击按钮弹出设置时间间隔选择框
        $('#control_menu').append('<button type="button" class="btn btn-default" data-toggle="modal" data-target="#TimeModal" id="refresh_select"><span class="glyphicon glyphicon-time" aria-hidden="true"></span></button>')


        //首次加载是否已经收藏
        if (fravstar_action == 'count') {
            fravstar(response.dashboard.id)
        } else {
            // if unselect , 代表已经收藏, 默认值是没有收藏,就不用改
            if (fravstar_action == 'unselect') {
                $('#fravstar').removeClass("glyphicon-heart-empty").addClass('glyphicon-heart')
            }
        }
        var chart_style = response.dashboard.metadata.echart_style;
        if (chart_style=='dark'){
            $('body,html').css('background', 'url(' + dark_background_url + ')');
        } else if (chart_style == 'vintage'){
            $('body,html').css('background', 'url(' + vintage_background_url + ')');
        }
        //操作样式框
        var radios = document.querySelectorAll("input[name='theme']")
        var btn_theme = document.querySelectorAll(".btn_theme");
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].value == chart_style) {
                radios[i].setAttribute('checked', 'checked');
                if (radios[i].checked) {
                    btn_theme[i].className = "btn_theme theme_checked";
                }
            }
            radios[i].index = i;
            radios[i].onclick = function () {
                for (let i = 0; i < radios.length; i++) {
                    btn_theme[i].className = "btn_theme";
                }
                btn_theme[this.index].className = "btn_theme theme_checked"
            }
        }
        $("#btn_confirm").click(function () {
            chart_style = $("input[name='theme']:checked").val();
            $.get(echart_css_api + dashboard_id + "?echart_style=" + chart_style, function (res) {
                if (res.status == 0) {
                    for (const key in echart_dict) {
                        echart_dict[key].dispose()
                    }
                    location.reload();
                    read_dashboard(response.dashboard.id)
                } else {
                    console.log(res.message);
                }
            })

        })
        //每个slice
        response.dashboard.slices.forEach(function (val, index, arr) {

            //postition顺序和slice顺序不一样
            var position
            for (var i = 0; i <= response.dashboard.position_json.length; i++) {
                if (response.dashboard.position_json[i].slice_id == val.slice_id) {
                    position = response.dashboard.position_json[i]
                    break
                }
            }
            //位置,有可能没有postion,但我们在设计的时候尽量避免这样情况出现
            if (position == undefined) {
                position = {
                    col: 1,
                    row: 0,
                    size_x: 4,
                    size_y: 4,
                }
            }

            var table_id = val.form_data.datasource.split('__')[0]

            var form_data = val.form_data

            if (val.form_data.viz_type !== "filter_box") {
                if (filter_paramets.length > 0) {
                    form_data.extra_filters = filter_paramets
                }
                //时间参数
                for (var key in time_filter) {
                    form_data[key] = time_filter[key]
                }

            }


            var url = base_slice_url + table_id + '?form_data=' + JSON.stringify(val.form_data)


            //TODO:这里是异步请求，放回数据有先后，移动端有区别，需要用postition来调整参数
            verbose_map = response.verbose_map
            if (interval > 0) {
                setTimeout(
                    add_slice(position, url, val.slice_name, val.description, slice_width_unit, force_refresh, chart_style),
                    interval + index * 300
                )
            } else {
                add_slice(position, url, val.slice_name, val.description, slice_width_unit, force_refresh, chart_style)
            }


        })
    }).fail(function () {
        $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">数据加载失败</div>')
    })
}

$(function () {
    $("#btn_confirm_refresh").click(function () {
        var data_time = $('.refresh_select > p').attr('data-time');
        force_refresh = true
        if (data_time > 0) {
            var timer = setInterval(function () {
                read_dashboard(dashboard_id, force_refresh = force_refresh, interval = parseInt(data_time));
                $(".refresh_select ul li").click(function () {
                    clearInterval(timer)

                })
            }, parseInt(data_time))
        }
        if (data_time == '0') {
            clearInterval(timer)
        }
    });
})

function add_slice(position, url, slice_name, description, slice_width_unit, force_refresh, chart_style) {

    //console.log(response)
    var slice_id = 'slice_cell' + position['slice_id']
    var slice_height = slice_height_unit * position['size_y']
    var slice_width = slice_width_unit * position['size_x']
    var slice_top = slice_height_unit * position['row'] + 98
    var slice_left = slice_width_unit * (position['col'] - 1) + 5

    //是否强制刷新
    var temp_url = url
    if (force_refresh) {
        temp_url += '&force=true'
    }

    $.get(temp_url).done(function (response) {

        console.log(response)

        //全屏定位
        //移动端定位-每个图一栏
        if (!force_refresh) {
            //新的要加div
            if (document.documentElement.clientWidth > 600) {
                $(dashboard_content_id).append('<div style="position: absolute;width:' +
                    slice_width + 'px;height:' +
                    slice_height + 'px;left:' +
                    slice_left + 'px;top:' +
                    slice_top + 'px;"><div id="' +
                    slice_id + '" style="height:' +
                    (slice_height - 2) + 'px;width:' +
                    (slice_width - 2) + 'px;"></div></div>'
                )
            } else {
                $(dashboard_content_id).append('<div class="row" style="margin: 1px 5px 1px 5px"><div id="' +
                    slice_id + '" style="height:' +
                    (slice_height - 2) + 'px;"></div></div>'
                )
            }
        }

        console.log(response.form_data.viz_type)

        switch (response.form_data.viz_type) {
            // 做表单
            case 'filter_box':
                $('#' + slice_id).empty() //清空内容,重新画
                form_dom = generate_form(response, 　slice_name)
                $('#' + slice_id).append(form_dom)
                if (chart_style == 'dark') {
                    $('#' + slice_id).css({
                        backgroundColor: 'rgb(51,51,51)',
                    })
                    $('#' + slice_id + '>form').css({
                        margin: '5px 5px 0 5px',
                        color: '#fff'
                    })
                } else if (chart_style == 'vintage') {
                    $('#' + slice_id).css({
                        backgroundColor: 'rgb(254, 248, 239)',
                    })
                    $('#' + slice_id + '>form label').css({
                        margin: '5px 5px 0 5px',
                        color: '#000'
                    })
                }
                break

                //做表
            case 'table':
                $('#' + slice_id).empty()
                $('#' + slice_id).append('<table id="' +
                    slice_id + 'Table" class="table"></table>')
                $('#' + slice_id + 'Table').bootstrapTable('destroy').bootstrapTable(generate_table(response, 　slice_name, position['size_y']))
                $('#' + slice_id + 'Table').bootstrapTable('hideLoading');
                $('#' + slice_id).css({
                    backgroundColor: '#fef8ef',
                    margin:'10px 0'
                })
                break

                //标记和分割，不用请求数据，直接显示数据,暂时支持html
            case 'separator':
            case 'markup':
                $('#' + slice_id).empty()
                $('#' + slice_id).append(`<div class="markup_style ">${response.data.html}</div>`);
                $('#' + slice_id).css({
                    marginTop:'5px'
                })
                if(chart_style=="dark"){
                    $('#' + slice_id).css({
                        backgroundColor: '#333333',
                    })
                    $(".markup_style").addClass("style_dark")
                } else if (chart_style == "vintage"){
                    $('#' + slice_id).css({
                        backgroundColor: '#fef8ef',
                    })
                    $(".markup_style").addClass("style_vintage")
                } else if (chart_style == "macarons") {
                    $(".markup_style").addClass("style_macarons")
                }
                break
            
            //画图 , 不需要清空DOM, clear()就可重新画
            default:
                //TODO:根据不同类型选择对应的地图, 暂时默认是热力图
                if ((response.form_data.viz_type == 'country_map') & (response.form_data.stat_unit == 'city')) {
                    $('#' + slice_id).empty()
                    $('#'+slice_id).append('<div id="'+ response.form_data.slice_id +'map" class="geo_map"></div>')
                    inmapCount(response.data, response.form_data)
                } else {
                    // 高度留一点空隙
                    $('#' + slice_id).css("margin-top", "5px")
                    //TODO:chart_style 风格选择

                    var myChart
                    if (!force_refresh) {
                        myChart = echarts.init(document.getElementById(slice_id), chart_style)
                        echart_dict[slice_id] = myChart

                    } else {
                        myChart = echart_dict[slice_id]
                        myChart.clear()
                    }
                    generate_chart(myChart, response, 　slice_name, description, url)
                }
                
        }

    }).fail(function () {
        $(dashboard_content_id).append('<div style="position: absolute;width:' +
            slice_width + 'px;height:' +
            slice_height + 'px;left:' +
            slice_left + 'px;top:' +
            slice_top + 'px;"><div id="' +
            slice_id + '" style="height:' +
            (slice_height - 2) + 'px;width:' +
            (slice_width - 2) + 'px;"><div style="margin: 1px 5px 1px 5px" class="alert alert-warning" role="alert">' +
            '数据加载失败</div></div></div>'
        )
    })

}


//表单
function generate_form(response, 　slice_name) {
    var dom = '<form method="get"  role="form">'
    // 添加时间选项
    if (response.form_data.date_filter) {

        dom += '<label for=“since”> 开始时间 </label>'
        if (time_filter.since == undefined) {
            dom += '<input class="form-control" type="date" name="since">'
        } else {
            dom += '<input class="form-control" type="date" name="since" value="' + time_filter.since + '">'
        }


        dom += '<label for=“until”> 结束时间 </label>'

        if (time_filter.until == undefined) {
            dom += '<input class="form-control" type="date" name="until">'
        } else {
            dom += '<input class="form-control" type="date" name="until" value="' + time_filter.until + '">'
        }
    }

    //添加时间粒度
    if (response.form_data.show_sqla_time_granularity) {
        dom += '<label for=time_grain_sqla> 时间粒度 </label>'
        dom += '<select class="form-control" name="time_grain_sqla">'
        dom += '<option></option>'
        time_grain.forEach(function (val, index, arr) {
            if (time_filter.time_grain_sqla == val[0]) {
                dom += '<option value="' + val[0] + '" selected = "selected">' + val[1] + '</option>'
            } else {
                dom += '<option value="' + val[0] + '">' + val[1] + '</option>'
            }
        })
        dom += '</select>'
    }

    //添加筛选项  
    for (var i in response.data) {
        dom += '<label for="' + i + '">' + verbose_map[response.form_data.datasource][i] + '</label>'
        dom += '<select class="form-control" name=' + i + '>'
        dom += '<option></option>'
        response.data[i].forEach(function (val, index, arr) {
            if (filter_form[i] == val.id) {
                dom += '<option value="' + val.id + '" selected = "selected">' + val.text + '</option>'
            } else {
                dom += '<option value="' + val.id + '">' + val.text + '</option>'
            }
        })
        dom += '</select>'
    }
    dom += '<hr><button type="submit" class="btn-info">筛选</button>'
    dom += '</form>'
    return dom
}


//boostrap-table
function generate_table(response, 　slice_name, pageSize) {

    function genarate_fileds(datas) {
        var fields = [{
            field: '',
            title: '序号',
            formatter: function (value, row, index) {
                return index + 1;
            }
        }]
        datas.forEach(function (val, index, arr) {
            var label
            if(val == '__timestamp'){
                label=response.form_data.granularity_sqla
            }else{
                label=val
            }          
            fields.push({
                field: val,
                title: verbose_map[response.form_data.datasource][label] || label, //别名转化
                sortable: true
            })
        })
        return fields
    }
    if (response.data.records[0]['__timestamp'] !== undefined) {
        response.data.records.forEach(function (val, index, arr) {
            val['__timestamp'] = numberToDatetime(val['__timestamp'])
        })
    }

    return table_option = {
        search: response.form_data.include_search,  //是否添加搜索框
        pagination: true,
        pageNumber: 1,
        pageSize: pageSize * 3 - 6,
        pageList: [6,10, 20, 30, 50],
        cache: false,
        // height:'600px',
        paginationPreText: "上一页",
        paginationNextText: "下一页",
        striped: true,
        showRefresh: false,
        //sortName:'CreateTime',
        //sortOrder:'desc',
        //showColumns:true,
        //toolbar: '#toolbar',
        //singleSelect: true,           // 单选checkbox
        //
        //showExport: true,     //下载
        //exportDataType: "all",
        //exportTypes: ['excel'],
        columns: genarate_fileds(response.data.columns),
        data: response.data.records,
    }

}

//基本柱状图数据
function generate_chart(mychart, data, slice_name, description, url) {
    //构建图表
    var option

    //console.log·(data.form_data.viz_type)

    //TODO:后面不断添加其他图表类型
    switch (data.form_data.viz_type) {
        case 'dist_bar':
            option = dist_bar_viz(data.data, data.form_data)
            break;
        case 'line':
            option = time_line_viz(data.data, data.form_data)
            break;
        case 'bar':
            option = time_line_viz(data.data, data.form_data)
            break;
        case 'area':
            option = time_line_viz(data.data, data.form_data, boundaryGap = false)
            break;
        case 'pie':
            if (data.form_data.is_funnel) {
                option = funnel_viz(data.data, data.form_data)
            } else {
                option = pie_viz(data.data, data.form_data)
            }
            break;
        case 'country_map':
            if (data.form_data.stat_unit == 'city') {
                option = china_city(data.data, data.form_data)
                //option = 
            } else {
                option = china_map(data.data, data.form_data)
            }
            break;
        case 'world_map':
            option = world_map(data.data, data.form_data)
            break;
        case 'big_number':
            option = big_number_viz(data.data, data.form_data)
            break;
        case 'big_number_total':
            option = big_number_total(data.data, data.form_data)
            break;
        case 'word_cloud':
            option = word_cloud(data.data, data.form_data)
            break;
        case 'treemap':
            if(data.form_data.is_sunburst){
                option = newSunburst(data.data, data.form_data)    
            } else {
                option = treemap(data.data, data.form_data)    
            }
            break;
        case 'box_plot':
            option = box_plot(data.data, data.form_data)
            break;
        case 'bubble':
            if (data.form_data.stat_function == null) {
                option = bubble(data.data, data.form_data)
            } else {
                //其他类似方法
                switch (data.form_data.stat_function) {
                    case 'clustering':
                        option = clustering(data.data, data.form_data)
                        break;
                    default:
                        option = regression(data.data, data.form_data)
                }

            }

            break;
        case 'cal_heatmap':
            option = cal_heatmap(data.data, data.form_data)
            break;
        case 'histogram':
            option = histogram(data.data, data.form_data)
            break;
        case 'sunburst':
            option = sunburst(data.data, data.form_data)
            break;
        case 'sankey':
            option = sankey(data.data, data.form_data)
            break;
        case 'directed_force':
            option = directed_force(data.data, data.form_data)
            break;
        case 'chord':
            option = chord(data.data, data.form_data)
            break;
        case 'para':
            option = parallel(data.data, data.form_data)
            break;
        case 'heatmap':
            option = heatmap(data.data, data.form_data)
            break;

        case 'pivot_table':
            option = pivot_table(data.data, data.form_data)
            break;

        case 'dual_line':
            option = dual_line(data.data, data.form_data)
            break;

        default:
            //option = china_map(data.data)
            option = {
                title: {
                    //标题
                    text: slice_name,
                    textAlign: 'left',
                    subtext: '暂时不支持这种类型图表:' + data.form_data.viz_type

                }
            }
            console.log('without type viz, and pass')
    }

    //图表共同参数的设置
    if (option.title == undefined) {
        option.title = {
            //标题
            text: slice_name,
            textAlign: 'left',

        }

        //副标题和图例显示位置
        if (description) {
            // option.title['subtext'] = description
            if (option.legend !== undefined) {
                option.legend['top'] = 50
                option.legend['left'] = '15%'
            }
        } else {
            if (option.legend !== undefined) {
                option.legend['top'] = 24
                option.legend['left'] = '15%'
            }
        }
    }


    //图标工具栏
    option.toolbox = {
        show: true,
        right: 12,
        feature: {
            //dataView : {show: true, readOnly: true}, //显示数据
            saveAsImage: {
                show: true,
                title: '下载图片'
            },
            restore: {
                show: true
            },
            //dataZoom: {show: true}, //地图，热力图
            myDownloadCSV: {
                show: true,
                title: '下载数据',
                //path=svg, image=url
                icon: 'path://M249.856 389.12v-178.176c0-45.056 36.864-81.92 81.92-81.92h456.704l163.84 167.936v337.92c0 12.288-8.192 20.48-20.48 20.48s-20.48-8.192-20.48-20.48V337.92h-102.4c-34.816 0-61.44-26.624-61.44-61.44v-106.496h-415.744c-22.528 0-40.96 18.432-40.96 40.96v178.176h456.704c22.528 0 40.96 18.432 40.96 40.96v286.72c0 22.528-18.432 40.96-40.96 40.96h-456.704v61.44c0 22.528 18.432 40.96 40.96 40.96h538.624c22.528 0 40.96-18.432 40.96-40.96v-61.44c0-12.288 8.192-20.48 20.48-20.48s20.48 8.192 20.48 20.48v61.44c0 45.056-36.864 81.92-81.92 81.92h-538.624c-45.056 0-81.92-36.864-81.92-81.92v-61.44h-137.216c-22.528 0-40.96-18.432-40.96-40.96v-286.72c0-22.528 18.432-40.96 40.96-40.96h137.216z m538.624-202.752v90.112c0 10.24 8.192 20.48 20.48 20.48h86.016l-106.496-110.592z m-473.088 350.208c-14.336-38.912-40.96-57.344-83.968-59.392-59.392 4.096-90.112 36.864-94.208 102.4 2.048 65.536 34.816 100.352 94.208 102.4 47.104 0 77.824-22.528 88.064-67.584l-36.864-12.288c-4.096 32.768-22.528 47.104-49.152 47.104-34.816-2.048-53.248-26.624-55.296-71.68 2.048-45.056 20.48-67.584 55.296-69.632 24.576 2.048 40.96 14.336 47.104 36.864l34.816-8.192z m26.624 79.872c10.24 45.056 38.912 65.536 90.112 65.536s75.776-20.48 77.824-59.392c0-24.576-14.336-40.96-40.96-53.248l-36.864-12.288c-28.672-6.144-43.008-16.384-40.96-28.672 2.048-16.384 14.336-22.528 34.816-24.576 24.576 0 38.912 10.24 43.008 32.768l36.864-8.192c-6.144-36.864-34.816-57.344-81.92-55.296-45.056 2.048-69.632 20.48-71.68 53.248-2.048 28.672 16.384 47.104 57.344 57.344 10.24 2.048 20.48 4.096 30.72 8.192 22.528 6.144 32.768 16.384 30.72 30.72-2.048 18.432-14.336 26.624-38.912 28.672-28.672 0-47.104-14.336-51.2-45.056l-38.912 10.24z m380.928-137.216h-40.96l-49.152 145.408c-4.096 12.288-6.144 18.432-6.144 20.48 0-4.096-2.048-10.24-6.144-20.48l-51.2-147.456h-40.96l77.824 198.656h43.008l73.728-196.608z',
                onclick: function () {
                    var tmp_url = url + '&csv=true'
                    window.open(tmp_url, "_blank")
                }
            },
            myFroceRefresh: {
                show: true,
                title: '更新数据',
                //path=svg, image=url
                icon: 'path://M802.177829 256.786286C784.4992 112.142629 661.429029 0 512 0S239.5008 112.142629 221.822171 256.786286C98.000457 265.000229 0 367.786057 0 493.714286c0 131.285943 106.428343 237.714286 237.714286 237.714286l128 0 0-73.142857-128 0c-90.750171 0-164.571429-73.821257-164.571429-164.571429 0-86.213486 67.428571-158.250057 153.536-163.927771l60.392229-4.035657 7.356343-60.106971C307.856457 155.893029 401.3568 73.142857 512 73.142857s204.143543 82.750171 217.570743 192.4992l7.356343 60.106971 60.392229 4.035657C883.428571 335.464229 950.857143 407.5008 950.857143 493.714286c0 90.750171-73.821257 164.571429-164.571429 164.571429l-128 0 0 73.142857 128 0c131.285943 0 237.714286-106.428343 237.714286-237.714286C1024 367.786057 925.999543 265.000229 802.177829 256.786286z',
                onclick: function () {
                    var tmp_url = url
                    tmp_url += '&force=true'
                    //更新
                    $.get(tmp_url).done(function (response) {
                        mychart.clear()
                        generate_chart(mychart, response, slice_name, description, tmp_url)
                    })
                }
            },
        }
    }

    //图形显示区域大小和位置
    option['grid'] = {
        top: 100,
        bottom: 100,
    }

    //图标个性参数
    switch (data.form_data.viz_type) {
        case 'dist_bar':
            option.toolbox.feature.magicType = {
                type: ['line', 'bar', 'stack', 'tiled']
            }
            break;
        case 'bar':
            option.toolbox.feature.magicType = {
                type: ['line', 'bar', 'stack', 'tiled']
            }
            option.dataZoom = {
                show: true
            }
            break;
        case 'line':
            option.toolbox.feature.magicType = {
                type: ['line', 'bar', 'stack', 'tiled']
            }
            option.dataZoom = {
                show: true
            }
            break;

        case 'area':
            option.dataZoom = {
                show: true
            }
            break;

        case 'pie':
            // option = pie_viz(df)
            // console.log('pass')
            break;
        case 'country_map':
            // option = pie_viz(df)
            //mychart.on('brushselected', renderBrushed)
            // console.log('pass')
            break;
        case 'big_number':
            option.title.push({
                text: slice_name,
                textAlign: 'left',
            })
            break;

        case 'big_number_total':
            option.title.push({
                text: slice_name,
                textAlign: 'left',
            })
            break;

        case 'box_plot':
            option.dataZoom = {
                show: true
            }
            break;
        case 'bubble':
            option.toolbox.feature.dataZoom = {}
            break;

        default:
            // console.log('pass')
    }

    mychart.setOption(option, true)
}

//每个图形独立出来数据

//非时间序列的柱状图数据
function gene_bar_series(data, legend, fd, type = 'bar', boundaryGap = true) {
    var serie = [];
    var areaStyle
    var stack
    if (type == 'line' && !boundaryGap) {
        areaStyle = {
            normal: {}
        }
        stack = '总量'
    } else {
        areaStyle = {}
        stack = undefined
    }

    console.log(data)

    data.forEach(function (val, index, arr) {
        var item = {
            name: legend[index],
            type: type,
            barMaxWidth: 60,
            barGap: "10%",
            areaStyle: areaStyle,
            stack: stack,
            data: val,
        }

        //显示最大、最小值
        if (fd.show_max_min) {
            item.markPoint = {
                data: [{
                        type: 'max',
                        name: '最大值',
                        itemStyle: {
                            normal: {
                                label: {
                                    show: true,
                                    formatter: function (params, index) {
                                        return axisLabel_formatter(params.value, index, fd.y_axis_format);
                                    }
                                }
                            }
                        }
                    },
                    {
                        type: 'min',
                        name: '最小值',
                        itemStyle: {
                            normal: {
                                label: {
                                    show: true,
                                    formatter: function (params, index) {
                                        return axisLabel_formatter(params.value, index, fd.y_axis_format);
                                    }
                                }
                            }
                        }
                    },
                ],
            }
        }


        // 显示平均值
        if (fd.show_aver) {
            item.markLine = {
                data: [{
                    type: 'average',
                    name: '平均值',
                    itemStyle: {
                        normal: {
                            label: {
                                show: true,
                                formatter: function (params, index) {
                                    return axisLabel_formatter(params.value, index, fd.y_axis_format);
                                }
                            }
                        }
                    }
                }]
            }
        }

        //显示目标线
        if (fd.target_line){
            
            if (item.markLine == undefined) {
                item.markLine = {data: []}
            }

            item.markLine.data.push([{
                    //TODO: 目标线设计,颜色,显示值
                    name: '目标线',
                    coord: [0, fd.target_line]
                },{
                    coord: [val.length-1, fd.target_line]
                }]
            )
            
        }

        serie.push(item);
    })
    return serie
}


//饼图
function pie_viz(data, fd) {
    // 数据适配echart格式
    var values = []
    var legend = []
    data.forEach(function (val, index, arr) {
        values.push({
            'value': val.y,
            'name': val.x
        })
        legend.push(val.x)
    })
    var option = {
        legend: {
            //orient: 'vertical',
            data: legend,
        },
        tooltip: optionTooltip(fd),
        series: {
            type: 'pie',
            radius: '55%',
            center: ['50%', '60%'],
            data: values,
            itemStyle: {
                emphasis: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }
    }


    if (!fd.show_legend) {
        option.legend['show'] = false
        option.series['labelLine'] = {
            'normal': {
                'show': false
            }
        }
        option.series['label'] = {
            'normal': {
                'show': false
            }
        }
    }
    if (fd.donut) {
        option.series['radius'] = ['45%', '70%']
    }
    return option
}

//漏斗图
function funnel_viz(data, fd) {
    // 数据适配echart格式
    var values = []
    var legend = []
    data.forEach(function (val, index, arr) {
        values.push({
            'value': val.y,
            'name': val.x
        })
        legend.push(val.x)
    })

    var option = {
        legend: {
            //orient: 'vertical',
            data: legend,
        },
        tooltip: optionTooltip(fd),
        calculable: true,
        series: {
            type: 'funnel',
            // min: 0,
            // max: 100,
            minSize: '0%',
            maxSize: '100%',
            sort: 'descending',
            gap: 2,
            width: '70%',
            data: values,
            itemStyle: {
                emphasis: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            label: {
                normal: {
                    show: true,
                    position: 'inside'
                },
                emphasis: {
                    textStyle: {
                        fontSize: 20
                    }
                }
            },
        }
    }

    if (!fd.show_legend) {
        option.legend['show'] = false
        option.series.label.normal['show'] = false
    }

    return option
}

//柱状图
function dist_bar_viz(data, fd) {
    var option = {}
    var values = []
    var legend = []
    var xAxis_values = []
    var table_id = fd.datasource
    data.forEach(function (val, index, arr) {
        var tmp_values = []
        val.values.forEach(function (v, i, arr) {
            tmp_values.push(v.y)
            if (index == 0) {
                xAxis_values.push(v.x)
            }
        })
        values.push(tmp_values)
        legend.push(verbose_map[table_id][val.key] || val.key)
    })
    option = {
        legend: {
            //orient: 'horizontal',
            //type: 'scroll',
            data: legend,
        },
        tooltip: optionTooltip(fd),
        xAxis: [{
            type: 'category',
            data: xAxis_values
        }],
        yAxis: [{
            type: 'value',
            axisLabel: {
                formatter: function (value, index) {
                    return axisLabel_formatter(value, index, fd.y_axis_format)
                }
            }
        }],
        series: gene_bar_series(values, legend, fd),

    }

    if (!fd.show_legend) {
        option.legend['show'] = false
    }

    return option
}


//时间-折线
//柱状图
function time_line_viz(data, fd, boundaryGap = true) {
    var option = {}
    var values = []
    var legend = []
    var xAxis_values = []
    var table_id = fd.datasource
    data.forEach(function (val, index, arr) {
        var tmp_values = []
        val.values.forEach(function (v, i, arr) {
            tmp_values.push(v.y)
            if (index == 0) {
                xAxis_values.push(numberToDatetime(v.x))
            }
        })
        values.push(tmp_values)
        // key可能是list 或 string
        if (typeof val.key === 'string') {
            legend.push(verbose_map[table_id][val.key] || val.key)
        } else {
            var tmp_key = ''
            val.key.forEach(function (val, index, arr) {
                tmp_key += verbose_map[table_id][val] || val
                tmp_key += ','
            })
            legend.push(tmp_key.substring(0, tmp_key.length - 1))
        }

    })
    option = {
        legend: {
            data: legend,
        },
        grid: {
            height: '70%',
            y: '20%'
        },
        tooltip: optionTooltip(fd),
        xAxis: [{
            type: 'category',
            boundaryGap: boundaryGap,
            data: xAxis_values
        }],
        yAxis: [{
            type: 'value',
            //min: 'dataMin',
            name: fd.y_axis_label,
            axisLabel: {
                formatter: function (value, index) {
                    return axisLabel_formatter(value, index, fd.y_axis_format)
                }
            }
        }],
        series: gene_bar_series(values, legend, fd, type = 'line', boundaryGap = boundaryGap)
    }

    //console.log('max_min:',  fd.y_axis_bounds)

    if (fd.y_axis_bounds[0] !== undefined) {
        option.yAxis[0]['min'] = fd.y_axis_bounds[0]
    }
    if (fd.y_axis_bounds[1] !== undefined) {
        option.yAxis[0]['max'] = fd.y_axis_bounds[1]
    }
    if (!fd.show_legend) {
        option.legend['show'] = false
    }

    return option
}


//折线图（大数字）
function big_number_viz(data, fd) {
    var option = {}
    var values = []
    var xAxis_values = []
    data.data.forEach(function (val, index, arr) {
        values.push(val[1])
        xAxis_values.push(numberToDatetime(val[0]))
    })

    var compare_value

    if (values[values.length - 1] == 0 || values[values.length - 1 - data.compare_lag] == undefined) {
        compare_value = 0
    } else {
        compare_value = (values[values.length - 1] - values[values.length - 1 - data.compare_lag]) / values[values.length - 1] * 100
    }

    var sub_text_color

    if (compare_value < 0) {
        sub_text_color = 'green'
    } else {
        sub_text_color = 'red'
    }
    option = {
        title: [{
            z: 5,
            text: axisLabel_formatter(values[values.length - 1], 0, fd.y_axis_format),
            subtext: compare_value.toFixed(2) + '%' + data.compare_suffix,
            left: 'center',
            top: '50%',
            textStyle: {
                fontSize: 40,
                align: 'center',

            },
            subtextStyle: {
                fontSize: 20,
                align: 'center',
                color: sub_text_color,
            }

        }],
        // tooltip: {
        //     left: '95%',
        //     trigger: 'axis',
        //     axisPointer: { // 坐标轴指示器，坐标轴触发有效
        //         type: 'shadow' // 默认为直线，可选为：'line' | 'shadow'
        //     }
        // },
        tooltip: optionTooltip(fd),
        xAxis: [{
            type: 'category',
            data: xAxis_values,
            show: false,
        }],
        yAxis: [{
            type: 'value',
            show: false,
        }],
        series: {
            type: 'line',
            data: values
        }
    }

    return option
}

//大数字
function big_number_total(data, data_form) {
    data_form = data_form.y_axis_format
    option = {
        title: [{
            z: 5,
            text: axisLabel_formatter(data.data[0], 0, data_form),
            subtext: data.subheader,
            left: 'center',
            top: '35%',
            textStyle: {
                fontSize: 45,
                align: 'center',
            },
            subtextStyle: {
                fontSize: 20,
                align: 'center',
            }

        }],

    }

    return option
}

//地图
function world_map(data, fd) {
    //TODO：还有气泡没有做
    var option = {}
    var values = []
    var max_value = data[0].m1
    data.forEach(function (val, index, arr) {
        values.push({
            //TODO: 包含多个数据
            'value': val.m1,
            'name': val.name
        })
        if (max_value < val.m1) {
            max_value = val.m1
        }
    })

    option = {
        tooltip: optionTooltip(fd),
        visualMap: {
            min: 0,
            max: max_value,
            left: 'left',
            top: 'bottom',
            text: ['高', '低'], // 文本，默认为数值文本
            calculable: true,
            textStyle: {
                color: '#FFF',
            }
        },

        series: [{
            type: 'map',
            //zoom: 2,
            itemStyle: {
                emphasis: {
                    label: {
                        show: true
                    }
                }
            },
            roam: true, //可以放缩
            mapType: 'world',
            data: values
        }]

    }
    return option
}


//中国地图
function china_map(data, fd) {

    var option = {}
    var values = []
    var max_value = data[0].metric
    data.forEach(function (val, index, arr) {
        values.push({
            'value': val.metric,
            'name': val.country_id
        })
        if (max_value < val.metric) {
            max_value = val.metric
        }
    })

    option = {
        tooltip: optionTooltip(fd),

        visualMap: {
            //min: 'dataMin',
            max: max_value,
            left: 'left',
            top: 'bottom',
            text: ['高', '低'], // 文本，默认为数值文本
            calculable: true,
            textStyle: {
                color: '#FFF',
            }
        },

        series: [{
            type: 'map',
            zoom: 1,
            label: {
                emphasis: {
                    show: false
                }
            },
            roam: true, //可以放缩
            mapType: 'china',
            data: values
        }]

    }
    return option
}


//地区地图
function china_city(data, fd) {

    var option = {}
    var values = []
    var bol_size = Number(fd.max_bubble_size)
    var reduce_size = Number(fd.reduce_size)
    //TODO：数字显示整理
    var max_value = data[0].metric
    data.forEach(function (val, index, arr) {
        var geoCoord = geoCoordMap[val.country_id];
        if (geoCoord) {
            values.push({
                'value': geoCoord.concat(val.metric),
                'name': val.country_id
            })
            if (max_value < val.metric) {
                max_value = val.metric
            }
        }
    })

    option = {

        geo: {
            map: 'china',
            label: {
                emphasis: {
                    show: false
                }
            },
            roam: true,
            itemStyle: {
                normal: {
                    areaColor: '#323c48',
                    borderColor: '#111'
                },
                emphasis: {
                    areaColor: '#2a333d'
                }
            }
        },
        tooltip: optionTooltip(fd),
        visualMap: {
            //min: 0,   //暂时没有负数
            max: max_value,
            left: 'left',
            top: 'bottom',
            text: ['高', '低'], // 文本，默认为数值文本
            calculable: true,
            textStyle: {
                color: '#FFF',
            }
        },
        series: [{
                type: 'scatter',
                coordinateSystem: 'geo',
                data: values,
                symbolSize: function (val) {
                    //TODO：点大小的动态调整
                    return Math.max(val[2] * bol_size / reduce_size, 8);
                },
                label: {
                    normal: {
                        formatter: '{b}',
                        position: 'right',
                        show: false
                    },
                    emphasis: {
                        formatter: '{b}',
                        show: false
                    }
                },
                itemStyle: {
                    //show:false,
                    normal: {
                        color: '#ddb926'
                    }
                }
            },

        ]
    }
    return option
}

// 新增旭日饼图 -- treemap_data
function newSunburst(data, fd) {
    var values = [];
    var data_color = ['red', 'orange', 'green', 'blue'];
    var data = data[0]  // 只获取第一个数据, 多个饼图暂时不考虑
    var other_childern = [];
    
    data.children.forEach(function(val, index){
        if (index <= data_color.length) {
            values.push(val)
        } else {
            val['itemStyle'] = {
                color: data_color[index % data_color.length]
            }
            other_childern.push(val)
        }
    })

    values.push({
        name: 'other',
        itemStyle: {
            color: 'purple'
        },
        children: other_childern
    })

    option = {
        tooltip: optionTooltip(fd),
        series: {
            type: 'sunburst',
            highlightPolicy: 'ancestor',
            data: values,
            radius: [0, '95%'],
            sort: null,
            levels: [{}, {
                r0: '15%',
                r: '35%',
                itemStyle: {
                    borderWidth: 2
                },
                label: {
                    rotate: 'tangential',
                    minAngle: 0.3
                }
            }, {
                r0: '35%',
                r: '70%',
                label: {
                    align: 'right'
                }
            }, {
                r0: '70%',
                r: '72%',
                label: {
                    position: 'outside',
                    padding: 3,
                    silent: false
                },
                itemStyle: {
                    borderWidth: 3
                }
            }]
        }
    };
    return option;
}

// 新增inmap
function inmapCount(data, fd) {
    var table_id = fd.datasource
    var values = []
    data.forEach(function (val, index, arr) {
        var geoCoord = geoCoordMap[val.country_id];
        if (geoCoord) {
            values.push({
                'count': val.metric,
                'lng': geoCoord[0],
                'lat': geoCoord[1],
                'name': val.country_id,
            })
        }
    })
    var inmap = new inMap.Map({
        id: fd.slice_id+'map',
        center: ["105.403119", "38.028658"],
        skin: "WhiteLover",   //TODO 换背景参数
        zoom: {
            value: 5,
            show: true,
            max: 18,
            min: 5
        },
    })

    var overlay

    switch (fd.inmap_type){
        case 'Heat':
            overlay = new inMap.HeatOverlay({
                //TODO: 热力图颜色设置
                style: {
                    normal: {
                        radius: fd.max_bubble_size, // 半径
                    }
                },
                data: values,
                event: {
                    onState(state) {
                        // console.log('地图变化状态', state); //滚动变化
                    }
                }
            })
        break

        case 'Honeycomb':
            overlay = new inMap.HoneycombOverlay({
                tooltip: {
                    show: true,
                    formatter: '{count}'
                },
                legend: {
                    show: true,
                    title: verbose_map[table_id][fd.secondary_metric] || fd.secondary_metric
                },
                style: {
                    colors: [
                        "rgba(156,200,249,0.7)", "rgba(93,158,247,0.7)",
                        "rgba(134,207,55,0.7)",
                        "rgba(252,198,10,0.7)", "rgba(255,144,0,0.7)", "rgba(255,72,0,0.7)",
                        "rgba(255,0,0,0.7)"
                    ],
                    normal: {
                        backgroundColor: 'rgba(200, 200, 200, 0.5)',
                        padding: 3,
                        size: fd.max_bubble_size,
                    },
                    mouseOver: {
                        shadowColor: 'rgba(255, 250, 255, 1)',
                        shadowBlur: 20,
                    },
                    selected: {
                        backgroundColor: 'rgba(184,0,0,1)',
                        borderColor: "rgba(255,255,255,1)"
                    },
                },
                data: values
            })
        break;

        default:
            overlay = new inMap.DotOverlay({
                tooltip: {
                    show: true,
                    formatter: function(params) {
                        return (`<p>${params.name}:${params.count}</p>`)
                    },

                },
                legend: {
                    show: true,
                    title: verbose_map[table_id][fd.secondary_metric] || fd.secondary_metric
                },
                style: {
                    colors: [    //加颜色能自动区分
                        "rgba(156,200,249,0.7)",
                        "rgba(93,158,247,0.7)",
                        "rgba(134,207,55,0.7)",
                        "rgba(252,198,10,0.7)",
                        "rgba(255,144,0,0.7)",
                        "rgba(255,72,0,0.7)",
                        "rgba(255,0,0,0.7)"
                    ],
                    normal: {
                        backgroundColor: 'rgba(200, 200, 50, 1)',
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,1)",
                        size: 10,
                        label: {     //地方名字
                           show: true,
                           color: "rgba(255,0,0,1)"
                        }
                    },
                    mouseOver: {
                        backgroundColor: 'rgba(200, 200, 200, 1)',
                        borderColor: "rgba(255,255,255,1)",
                        borderWidth: 4,
                    },
                    selected: {
                        backgroundColor: 'rgba(184,0,0,1)',
                        borderColor: "rgba(255,255,255,1)"
                    },
                },
                data: values,
                event: {
                    // onMouseClick: function (item, event) {
                    //     //能获取当前点的信息
                    // }
                }
            });
    }

    inmap.add(overlay)

}

//词云
function word_cloud(data, fd) {
    // 数据适配echart格式
    var option = {}
    var values = []
    data.forEach(function (val, index, arr) {
        values.push({
            'value': val.size,
            'name': val.text
        })
    })
    option = {
        tooltip: optionTooltip(fd),
        legend: {
            show: false
        },
        series: {
            type: 'wordCloud',
            gridSize: 15,
            sizeRange: [12, 60],
            rotationRange: [-45, 45],
            shape: 'circle',
            data: values,
            textStyle: {
                // TODO: 挑选适合dark主题的色系
                // normal: {
                //     color: function() {
                //         return 'rgb(' + [
                //             Math.round(Math.random() * 160),
                //             Math.round(Math.random() * 160),
                //             Math.round(Math.random() * 160)
                //         ].join(',') + ')';
                //     }
                // },
                emphasis: {
                    shadowBlur: 10,
                    shadowColor: '#333'
                }
            },
        }
    }
    return option
}


//求队列里面的和
function calcule_treemap_total(parent, child_data) {
    if (child_data[0].children !== undefined) {
        for (var i = 0; i < child_data.length; i++) {
            if (child_data[i].children.length>0){
                child_data[i] = calcule_treemap_total(child_data[i], child_data[i].children)
            }else{
                child_data[i].value=0
            }
        }
    }

    var sum = 0
    child_data.forEach(function (val, index, arr) {
        sum += val.value
        val.name = parent.name + '.' + val.name
    })
    parent.value = sum
    return parent

}


//树状图
function treemap(data, fd) {
    table_id = fd.datasource
    series_name = data[0]['name']
    data[0]['name'] = verbose_map[table_id][series_name] || series_name
    data[0] = calcule_treemap_total(data[0], data[0].children)

    //console.log('trese', data[0])

    option = {
        tooltip: optionTooltip(fd),
        legend: {
            show: false
        },

        series: {
            name: verbose_map[table_id][series_name] || series_name,
            type: 'treemap',
            visibleMin: 100,
            data: data[0].children,
            leafDepth: 2,
            levels: [{
                    itemStyle: {
                        normal: {
                            borderColor: '#555',
                            borderWidth: 4,
                            gapWidth: 4
                        }
                    }
                },
                {
                    colorSaturation: [0.3, 0.6],
                    itemStyle: {
                        normal: {
                            borderColorSaturation: 0.7,
                            gapWidth: 3,
                            borderWidth: 3
                        }
                    }
                },
                {
                    colorSaturation: [0.3, 0.5],
                    itemStyle: {
                        normal: {
                            borderColorSaturation: 0.6,
                            gapWidth: 1
                        }
                    }
                },
                {
                    colorSaturation: [0.3, 0.5]
                }
            ]
        },

    }
    return option
}


//箱线图
function box_plot(data, fd) {

    var option = {}
    var xAxis_values = []
    var values = []
    var outliers = []
    data.forEach(function (val, index, arr) {
        xAxis_values.push(val.label)
        values.push([val.values.whisker_low, val.values.Q1, val.values.Q2, val.values.Q3, val.values.whisker_high])
        for (var i = 0; i < val.values.outliers.length; i++) {
            outliers.push([index, val.values.outliers[i]])
        }
    })
    option = {
        tooltip: optionTooltip(fd),
        xAxis: {
            type: 'category',
            data: xAxis_values,
            splitArea: {
                show: false
            },
            axisLabel: {
                formatter: '{value}'
            },
            splitLine: {
                show: false
            }
        },
        yAxis: {
            type: 'value',
            name: '-',
            splitArea: {
                show: false
            },
            axisLabel: {
                formatter: function (value, index) {
                    return axisLabel_formatter(value, index, fd.y_axis_format)
                }
            }
        },
        series: [{
            name: '-',
            type: 'boxplot',
            data: values,
        }, {
            name: '异常点',
            type: 'pictorialBar',
            symbolPosition: 'end',
            symbolSize: 8,
            barGap: '10%',
            data: outliers
        }]
    }
    //console.log('box:', option)

    return option

}

//时间热力图
function cal_heatmap(data, fd) {

    var option
    var date_value = []
    var max_value = 0
    var start_year = numberToDatetime(data.start).split('/')[0]

    for (val in data.timestamps) {
        if (data.timestamps[val] > max_value) {
            max_value = data.timestamps[val]
        }
        date_value.push([numberToDatetime(val, type = 'date'), data.timestamps[val]])
    }
    option = {
        tooltip: optionTooltip(fd),
        visualMap: {
            min: 0,
            max: max_value,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            top: 'top',
            textStyle: {
                color: '#FFF',
            }
        },
        calendar: {
            range: start_year, //['2011-01-01', '2011-12-31'],//'2011',
            cellSize: ['15', 15],
            left: 70,
            right: 30,
            dayLabel: {
                nameMap: 'cn',
                color: '#FFF'
            },
            monthLabel: {
                nameMap: 'cn',
                color: '#FFF'
            },
            yearLabel: {
                show: true,
                // formatter:index[i].name,
            },
        },
        series: {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: date_value,
            // tooltip: {
            //     // TODO：显示调整
            //     formatter: function (data) {
            //         return data.value[0] + '<br/>' + data.value[1]
            //     },
            // },
        },

    }
    return option
}


//散点气泡图
function bubble(data, fd) {
    var entity = fd.entity

    var schema = [{
            name: 'x',
            index: 0,
            text: verbose_map[fd.datasource][fd.x] || fd.x
        },
        {
            name: 'y',
            index: 1,
            text: verbose_map[fd.datasource][fd.y] || fd.y
        },
        {
            name: 'size',
            index: 2,
            text: verbose_map[fd.datasource][fd.size] || fd.size
        },
        {
            name: 'name',
            index: 3,
            text: verbose_map[fd.datasource][entity] || entity
        }
    ];

    var option
    var series = []
    var legend = []

    var bol_size = Number(fd.max_bubble_size)
    var reduce_size = fd.reduce_size

    data.forEach(function (val, index, arr) {
        legend.push(val.key)

        var tmp_values = []
        val.values.forEach(function (val, index, arr) {
            tmp_values.push([val.x, val.y, val.size, val[entity]])
        })

        series.push({
            name: val.key,
            type: 'scatter',
            data: tmp_values,
            symbolSize: function (data) {
                return Math.max(Math.sqrt(data[2]) * bol_size / reduce_size, 5)
            },
            // TODO: 加参数是否显示标记
            // markPoint : {
            //     data : [
            //         {type : 'max', name: '最大值'},
            //         {type : 'min', name: '最小值'}
            //     ]
            // },
            // markLine : {
            //     lineStyle: {
            //         normal: {
            //             type: 'solid'
            //         }
            //     },
            //     data : [
            //         {type : 'average', name: '平均值'},
            //     ]
            // },
        })

    })

    option = {
        legend: {
            data: legend,
        },
        tooltip: optionTooltip(fd, schema),
        xAxis: {
            type: 'value',
            name: schema[0].text
        },
        yAxis: {
            type: 'value',
            name: schema[1].text,
            axisLabel: {
                formatter: function (value, index) {
                    return axisLabel_formatter(value, index, fd.y_axis_format)
                }
            }
        },
        series: series,
    }

    if (!fd.show_legend) {
        option.legend['show'] = false
    }
    return option
}

//分类-散点图,前端的实时计算,没有保存到数据库
function clustering(data, fd) {

    var entity = fd.entity
    var schema = [{
            name: 'x',
            index: 0,
            text: verbose_map[fd.datasource][fd.x] || fd.x
        },
        {
            name: 'y',
            index: 1,
            text: verbose_map[fd.datasource][fd.y] || fd.y
        },
        {
            name: 'size',
            index: 2,
            text: verbose_map[fd.datasource][fd.size] || fd.size
        },
        {
            name: 'name',
            index: 3,
            text: verbose_map[fd.datasource][entity] || entity
        }
    ]
    var values = []
    var origin_values = {}

    var bol_size = Number(fd.max_bubble_size)
    var reduce_size = Number(fd.reduce_size)

    data.forEach(function (val, index, arr) {
        val.values.forEach(function (val, index, arr) {
            //分类参数可以多个 data = [[1,2,3,4], [,.1,2.1,3.1,4.1]], 要归一化才能把所有放在一起比较
            values.push([val.x, val.y])
            origin_values[String(val.x) + '|' + String(val.y)] = [val.size, val[entity]]
        })
    })
    // 分类
    var result = ecStat.clustering.hierarchicalKMeans(values, Number(fd.stat_number), false)

    var centroids = result.centroids
    var ptsInCluster = result.pointsInCluster
    var series = []
    var legend = []


    for (var i = 0; i < centroids.length; i++) {

        //补充更多信息
        var tmp_data = []
        ptsInCluster[i].forEach(function (val, index, arr) {
            tmp_data.push([...val, ...origin_values[String(val[0]) + '|' + String(val[1])]])
        })

        legend.push('类别：' + i)

        series.push({
            name: '类别：' + i,
            type: 'scatter',
            data: tmp_data,
            symbolSize: function (data) {
                return Math.max(Math.sqrt(data[2]) * bol_size / reduce_size, 10)
            },
            markPoint: {
                symbolSize: 50,
                label: {
                    normal: {
                        show: false,
                        fontSize: 18
                    },
                    emphasis: {
                        show: true,
                        position: 'top',
                        formatter: function (params) {

                            return Math.round(params.data.coord[0] * 100) / 100 + '  ' +
                                Math.round(params.data.coord[1] * 100) / 100 + ' ';
                        },
                        textStyle: {
                            color: '#FFF'
                        }
                    }
                },

                itemStyle: {
                    normal: {
                        opacity: 0.8
                    }
                },
                data: [{
                    coord: centroids[i]
                }]
            }
        });
    }

    var option = {
        legend: {
            data: legend,
        },
        tooltip: optionTooltip(fd, schema),
        xAxis: {
            type: 'value',
            name: schema[0].text,
        },
        yAxis: {
            type: 'value',
            name: schema[1].text,
            axisLabel: {
                formatter: function (value, index) {
                    return axisLabel_formatter(value, index, fd.y_axis_format)
                }
            }
        },
        series: series
    }
    return option
}

//回归分析散点图,前端的实时计算,没有保存到数据库
function regression(data, fd) {

    var entity = fd.entity
    var schema = [{
            name: 'x',
            index: 0,
            text: verbose_map[fd.datasource][fd.x] || fd.x
        },
        {
            name: 'y',
            index: 1,
            text: verbose_map[fd.datasource][fd.y] || fd.y
        },
        {
            name: 'size',
            index: 2,
            text: verbose_map[fd.datasource][fd.size] || fd.size
        },
        {
            name: 'name',
            index: 3,
            text: verbose_map[fd.datasource][entity] || entity
        }
    ]

    var values = []
    var origin_values = []
    data.forEach(function (val, index, arr) {
        val.values.forEach(function (val, index, arr) {
            values.push([val.x, val.y])
            origin_values.push([val.x, val.y, val.size, val[entity]])
        })
    })


    // 回归分析
    if (fd.stat_function !== 'polynomial') {
        var myRegression = ecStat.regression(fd.stat_function, values)
    } else {
        //多项式多number参数
        //console.log(fd.other.type)
        var myRegression = ecStat.regression(fd.stat_function, values, Number(fd.stat_number))
    }

    var option = {
        tooltip: optionTooltip(fd, schema),
        xAxis: {
            type: 'value',
            name: schema[0].text,
        },
        yAxis: {
            type: 'value',
            name: schema[1].text,
            axisLabel: {
                formatter: function (value, index) {
                    return axisLabel_formatter(value, index, fd.y_axis_format)
                }
            }
        },
        series: [{
            name: 'scatter',
            type: 'scatter',
            data: origin_values
        }, {
            name: 'line',
            type: 'line',
            showSymbol: false,
            data: myRegression.points,
            markPoint: {
                itemStyle: {
                    normal: {
                        color: 'transparent'
                    }
                },
                label: {
                    normal: {
                        show: true,
                        top: '30%',
                        left: '60%',
                        formatter: myRegression.expression,
                        textStyle: {
                            color: '#FFF',
                            fontSize: 20
                        }
                    }
                },
                data: [{
                    coord: myRegression.points[myRegression.points.length - 1]
                }]
            }
        }]
    }
    return option
}

//直方图
function histogram(data, fd) {
    var option
    var bins = ecStat.histogram(data)

    option = {
        tooltip: optionTooltip(fd),
        xAxis: [{
            type: 'value',
            scale: true, //这个一定要设，不然barWidth和bins对应不上
        }],
        yAxis: [{
            scale: true,
            type: 'value',
        }],
        series: [{
            //name: 'height',
            type: 'bar',
            //barWidth: '99.3%',
            label: {
                normal: {
                    show: true,
                    position: 'insideTop',
                    formatter: function (params) {
                        return params.value[1];
                    }
                }
            },
            data: bins.data
        }]
    }
    return option
}


//多层拼图
function sunburst(data, fd) {
    var option

    var values = []

    var num_circle = fd.groupby.length

    //TODO: metric and second_metric 不一样的时候，要另外处理

    if ((fd.metric !== fd.secondary_metric) && (fd.secondary_metric !== undefined)) {
        num_circle -= 2
    }
    for (var i = 0; i < num_circle; i++) {
        values.push({})
    }

    data.forEach(function (val, index, arr) {

        for (var i = 0; i < num_circle; i++) {
            if (i == 0) {
                if (values[i][val[i]] == undefined) {
                    values[i][val[i]] = val[num_circle]
                } else {
                    values[i][val[i]] += val[num_circle]
                }
            } else {
                //多层命名
                var key = val.slice(0, i + 1).join('_')

                if (values[i][key] == undefined) {
                    values[i][key] = val[num_circle]
                } else {
                    values[i][key] += val[num_circle]
                }
            }
        }

    })

    //转换为符合echart格式

    //最里面一层
    var tmp_values = []
    for (var key in values[0]) {
        tmp_values.push({
            'name': key,
            'value': values[0][key]
        })
    }

    var pie_values = [tmp_values]

    for (var key = 1; key < values.length; key++) {
        //debugger
        //找下一层的数据
        var sub_tmp_values = []
        for (var i = 0; i < tmp_values.length; i++) {
            for (var sub_key in values[key]) {
                //按照上一层数据顺序
                //多层比较
                if (sub_key.split('_', key).join('_') == tmp_values[i].name) {
                    sub_tmp_values.push({
                        'name': sub_key,
                        'value': values[key][sub_key]
                    })
                }
            }

        }

        pie_values.push(sub_tmp_values)

        tmp_values = sub_tmp_values

    }



    //创建series
    var series = []
    for (var i = 0; i < num_circle; i++) {

        var radius_min = Math.floor(i * 80 / num_circle)
        var radius_max = radius_min + Math.floor(80 / num_circle)
        series.push({
            type: 'pie',
            selectedMode: 'single',
            radius: [radius_min + '%', radius_max + '%'],
            center: ['50%', '50%'],
            data: pie_values[i],
            label: {
                normal: {
                    show: false
                }
            },

        })
    }

    option = {
        tooltip: optionTooltip(fd),
        series: series
    }
    //console.log(option)
    return option
}

//桑基图
function sankey(data, fd) {
    var option

    var data_name = []

    var node = []

    data.forEach(function (val, index, arr) {
        if (data_name.indexOf(val.target) == -1) {
            node.push({
                'name': val.target
            })
            data_name.push(val.target)
        }

        if (data_name.indexOf(val.source) == -1) {
            data_name.push(val.source)
            node.push({
                'name': val.source
            })
        }
    })

    option = {
        tooltip: optionTooltip(fd),
        series: [{
            type: 'sankey',
            layout: 'none',
            label: {
                normal: {
                    color: '#FFF'
                }
            },
            data: node,
            links: data,
            itemStyle: {
                normal: {
                    borderWidth: 1,
                    borderColor: '#aaa'
                }
            },
            lineStyle: {
                normal: {
                    color: 'source',
                    curveness: 0.5
                }
            }
        }]
    }
    return option
}


//有向图
function directed_force(data, fd) {
    var option

    var data_name = []

    var node = []

    data.forEach(function (val, index, arr) {
        if (data_name.indexOf(val.target) == -1) {
            node.push({
                'name': val.target,
                'draggable': true,
                "symbolSize": val.value * 10, //TODO：这个大小要和尺寸成正比
            })
            data_name.push(val.target)
        }

        if (data_name.indexOf(val.source) == -1) {
            data_name.push(val.source)
            node.push({
                'name': val.source,
                'draggable': true,
                "symbolSize": val.value * 10,
            })
        }
    })

    option = {
        tooltip: optionTooltip(fd),
        series: [{
            type: 'graph',
            layout: 'force',
            force: {
                repulsion: 400 // 连线长度
            },
            focusNodeAdjacency: true,
            label: {
                normal: {
                    show: true,
                    color: '#FFF'
                }

            },
            data: node,
            links: data,
            itemStyle: {
                normal: {
                    borderWidth: 1,
                    borderColor: '#aaa'
                }
            },
            lineStyle: {
                normal: {
                    color: 'source',
                    curveness: 0.3,
                    type: "solid"
                }
            }
        }]
    }
    //console.log('graph', option)
    return option
}

//和弦图
function chord(data, fd) {
    // 数量没有表示出来
    var option

    var links = []

    var nodes = []
    //数据处理
    data.matrix.forEach(function (val, index, arr) {
        for (var i = 0; i < val.length; i++) {
            if (val[i] > 0) {
                links.push({
                    source: data.nodes[index],
                    target: data.nodes[i],
                    //symbolSize: val[i],
                })
            }
        }
    })

    data.nodes.forEach(function (val, index, arr) {
        nodes.push({
            name: val
        })
    })

    option = {
        tooltip: optionTooltip(fd),
        series: [{
            type: 'graph',
            layout: 'circular',
            force: {
                initLayout: 'circular',
                repulsion: 50,
                gravity: 0.5,
                edgeLength: 500,
                layoutAnimation: true,
            },

            roam: false,
            focusNodeAdjacency: true,
            //ribbonType: true,
            label: {
                normal: {
                    show: true,
                    color: '#FFF'
                }
            },

            data: nodes,
            links: links,
            itemStyle: {
                normal: {
                    label: {
                        rotate: true,
                        show: true,


                    },
                },
                emphasis: {
                    label: {
                        show: true
                    }
                }
            },
            lineStyle: {
                normal: {
                    color: 'source',
                    curveness: 0.3,
                    type: "solid"
                }
            }
        }]
    }
    return option
}

//平行坐标
function parallel(data, fd) {
    var option
    var parallelAxis = []
    var begin_number = 0
    // 包含项目轴
    if (fd.include_series) {
        begin_number = 1
        parallelAxis.push({
            dim: 0,
            name: verbose_map[fd.datasource][fd.series] || fd.series,
            type: 'category',
        })
    }

    fd.metrics.forEach(function (val, index, arr) {
        parallelAxis.push({
            dim: index + begin_number,
            max: 'dataMax',
            min: 'dataMin',
            name: verbose_map[fd.datasource][val] || val
        })
    })

    var series = []

    var legend = []


    data.forEach(function (val, index, arr) {
        var items = []

        // 包含项目轴
        if (fd.include_series) {
            items.push(val[fd.series])
        }

        for (var i = 0; i < fd.metrics.length; i++) {
            items.push(val[fd.metrics[i]])
        }

        series.push({
            name: val[fd.series],
            type: 'parallel',
            data: [items],
            lineStyle: {
                normal: {
                    width: 1,
                    opacity: 0.5
                }
            }
        })

        legend.push(val[fd.series])
    })

    // 包含项目轴
    if (fd.include_series) {
        parallelAxis[0]['data'] = legend
        parallelAxis[1]['inverse']=true;//第二条坐标轴翻转
        parallelAxis[1]['nameLocation'] = 'start';//第二条坐标轴名称显示位置
    }
    

    option = {
        tooltip: optionTooltip(fd),
        parallelAxis: parallelAxis,
        parallel: { // 这是『坐标系』的定义
            left: '5%', // 平行坐标系的位置设置
            right: '13%',
            bottom: '10%',
            top: '20%',
            parallelAxisDefault: { // 『坐标轴』的公有属性可以配置在这里避免重复书写
                type: 'value',
                nameLocation: 'end',
                nameGap: 20
            }
        },
        legend: {
            data: legend,
        },
        series: series,
    }

    if (!fd.show_legend) {
        option.legend['show'] = false
    }
    return option
}

//热力图
function heatmap(data, fd) {   
    var option
    var values = []
    var xAxis_data = []
    var yAxis_data = []
    var all_is_number = true
    data.records.forEach(function (val, index, arr) {
        if (xAxis_data.indexOf(val.x) == -1) {
            xAxis_data.push(val.x.toString())
        }

        if (yAxis_data.indexOf(val.y) == -1) {
            // echart bug 如果是数字不管怎样都会变成number
            if (isNaN(Number(val.y))) {
                all_is_number = false
            }
            yAxis_data.push(val.y)
        }
        // console.log(val.perc);

        // values.push([val.x, val.y, val.perc.toFixed(2), val.v])
        values.push([val.x, val.y, val.perc, val.v])
    })

    if (all_is_number) {
        yAxis_data = yAxis_data.sort(sortNumber)
        yAxis_data.forEach(function (val, index, arr) {
            // echart bug 如果是数字不管怎样都会变成number, 所以加如一点东西，让他强制是string
            yAxis_data[index] = val.toString() + '_'
        })
        values.forEach(function (val, index, arr) {
            val[1] = val[1].toString() + '_'
        })
    }


    option = {
        tooltip: optionTooltip(fd),
        xAxis: {
            type: 'category',
            data: xAxis_data,
            // splitArea: {
            //     show: true
            // }
        },
        grid: {
            height: '70%',
            y: '20%'
        },
        yAxis: {
            type: 'category',
            data: yAxis_data,
            // splitArea: {
            //     show: false
            // }
        },
        visualMap: {
            min: data.extents[0],
            max: data.extents[1],
            textStyle: {
                color: '#ecbc8f',
            },
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            top: '15'
        },
        series: [{
            type: 'heatmap',
            data: values,
            // label: {
            //     normal: { // 图上展示
            //         show: true
            //     }
            // },
            // tooltip: {

            // }, //鼠标移动到这里动态显示
            itemStyle: {
                emphasis: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    }
    return option
}


//透视图
function pivot_table(data, fd) {
    var indicator = []
    var series_data = []
    var columns_data = []
    var legend = []

    //只有一个值的时候，不一样的。
    if (data.columns.length == 1) {
        verbose_map[fd.datasource][fd.all_columns_x] || fd.all_columns_x

        legend.push(verbose_map[fd.datasource][fd.groupby[0]] || fd.groupby[0])

        columns_data.push({
            name: legend[0],
            value: [],
        })

        data.values.data.forEach(function (val, index, arr) {
            columns_data[0].value.push(val[0])
        })

    } else {

        data.columns.forEach(function (val, index, arr) {
            var key = val.slice(1).join('.')
            columns_data.push({
                name: key,
                value: []
            })
            legend.push(key)
        })

        data.values.data.forEach(function (val, index, arr) {
            val.forEach(function (v, index, arr) {
                columns_data[index].value.push(v)
            })
        })
    }

    data.values.index.forEach(function (val, index, arr) {
        //以后可以改变max
        indicator.push({
            'name': val,
            'max': fd.radar_max_value
        })
    })



    var option = {
        tooltip: optionTooltip(fd),
        legend: {
            data: legend,
        },
        radar: {
            shape: 'circle', //图像弧度
            radius: '65%',
            center: ['50%', '55%'],
            name: {
                textStyle: {
                    color: '#fff',
                    backgroundColor: '#999',
                    borderRadius: 6,
                    padding: [3, 5]
                }
            },
            indicator: indicator
        },
        series: [{
            type: 'radar',
            //areaStyle: {normal: {}}, //填充图形颜色
            data: columns_data,
            itemStyle: {
                normal: {
                    lineStyle: {
                        width: 4
                    },
                },
                emphasis: {
                    areaStyle: {
                        color: 'rgba(0,250,0,0.3)'
                    } //鼠标移动过去显示
                }
            }
        }]
    };

    //console.log(option)
    return option
}


//双坐标
function dual_line(data, fd) {
    var option = {}
    var series = []
    var table_id = fd.datasource

    var tmp_values = []
    var legend = []
    var xAxis_values = []

    //双坐标只有两组数据
    data[0].values.forEach(function (v, i, arr) {
        tmp_values.push(v.y)
        if (fd.granularity_sqla == undefined) {
            xAxis_values.push(v.x)
        } else {
            xAxis_values.push(numberToDatetime(v.x))
        }

    })

    legend.push(verbose_map[table_id][data[0].key] || data[0].key)

    series.push({
        name: [verbose_map[table_id][data[0].key] || data[0].key],
        type: 'bar',
        barMaxWidth: 60,
        barGap: "10%",
        yAxisIndex: 0,
        data: tmp_values,
    })

    tmp_values = []

    data[1].values.forEach(function (v, i, arr) {
        tmp_values.push(v.y)
    })

    legend.push(verbose_map[table_id][data[1].key] || data[1].key)

    series.push({
        name: [verbose_map[table_id][data[1].key] || data[1].key],
        type: 'line',
        yAxisIndex: 1,
        data: tmp_values,
    })

    option = {
        legend: {
            data: legend,
        },
        tooltip: optionTooltip(fd),
        xAxis: [{
            type: 'category',
            data: xAxis_values
        }],
        yAxis: [{
                type: 'value',
                position: 'left',
                axisLabel: {
                    formatter: function (value, index) {
                        return axisLabel_formatter(value, index, fd.y_axis_format)
                    }
                }
            },
            {
                type: 'value',
                position: 'right',
                axisLabel: {
                    formatter: function (value, index) {
                        return axisLabel_formatter(value, index, fd.y_axis_format)
                    }
                }
            }
        ],
        series: series
    }

    return option
}

//自动刷新时间

function interval_time(interval) {

    switch (interval) {
        case '10s':
            return 10000
        case '30s':
            return 30000
        case '10m':
            return 600000
        case '30m':
            return 1800000
        default:
            return 0
    }
}


//返回某一年的总天数  
function GetYearDays(wYear) {

    if ((wYear % 400 == 0) || ((wYear % 4 == 0) && (wYear % 100))) {
        return 366
    }

    return 366
}
//数字转日期
function numberToDatetime(date, type = 'datetime') {
    var tmp_datetime = new Date()
    var date_num = Number(date)

    if (type == 'date') {
        //,
        //console.log('time', start)
        date_num = date_num * 1000
        //console.log('time-change', date_num)
        tmp_datetime.setTime(date_num)
    } else {
        //tmp_datetime.setTime(date_num * 1000)
        tmp_datetime.setTime(date_num)
    }



    return tmp_datetime.toLocaleDateString()
}


//坐标轴的显示
function axisLabel_formatter(value, index, data_form) {
    // 格式化刻度显示
    var text
    // console.log('form', data_form)
    switch (data_form) {
        case '.3s':
            if (parseInt(value) == value) {
                // 是否整数大于3位数
                if (value < 1000) {
                    text = value.toString()
                } else {
                    text = (value / 1000).toFixed(1) + 'K'
                }

            } else {
                //有小数
                if (value < 1000) {
                    text = Number(value).toFixed(1)
                } else {
                    text = (value / 1000).toFixed(1) + 'K'
                }
            }
            break

        case '.4s':
            text = (value / 10000).toFixed(1) + '万'
            break

        case '￥,.2f':
            //TODO: ￥12,345.43 这样的格式
            text = '￥' + Number(value).toFixed(2)
            break

            //TODO:其他格式
            // case '.4r':

            // break

        case '.3%':
            text = Number(value) * 100
            text = text.toFixed(3)
            text = text.toString() + '%'
            break

        default:
            text = value
    }

    return text
}
//所有格式     
// ['.3s', '.3s | 12.3k'],
// ['.3%', '.3% | 1234543.210%'],
// ['.4r', '.4r | 12350'],
// ['.3f', '.3f | 12345.432'],
// ['+,', '+, | +12,345.4321'],
// ['$,.2f', '$,.2f | $12,345.43'],
// ['.4s', '.4s | 12.3万'],
// ['￥,.2f', '￥,.2f | ￥12,345.43'],



//工具显示
function optionTooltip(fd, schema) {
    var type = fd.viz_type
    if (type == "dist_bar" || type == "bar" || type == "line" || type == "area" || type == "dual_line") {
        function formatter(params, index) {
            var params_data = []
            for (let j = 0; j < params.length; j++) {
                params_data.push(`<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${params[j].color};"></span>` +
                    params[j].seriesName + " : " + axisLabel_formatter(params[j].data, index, fd.y_axis_format));
            }
            return params[0].name + '</br>' + params_data.join('</br>')
        }
        return {
            left: '95%',
            trigger: 'axis',
            axisPointer: { // 坐标轴指示器，坐标轴触发有效
                type: 'shadow' // 默认为直线，可选为：'line' | 'shadow'
            },
            formatter: formatter
        }
    } else if (type == "histogram"){
        return {
            trigger: 'axis'
        }
    } else if (type == "pie" || type == "sunburst") {
        return {
            confine: true,
            trigger: 'item',
            formatter: "{b}</br>{c} ({d}%)"
        }
    } else if (type == "world_map" || type == "country_map") {
        return {} //尚未完善
    } else if (type == "heatmap") {
        var x_name = verbose_map[fd.datasource][fd.all_columns_x] || fd.all_columns_x
        var y_name = verbose_map[fd.datasource][fd.all_columns_y] || fd.all_columns_y
        var metric = verbose_map[fd.datasource][fd.metric] || fd.metric

        function formatter(param,index) {
            return [
                x_name + ':' + param.data[0],
                y_name + ':' + param.data[1],
                metric + ':' + param.data[3],
                '占比：' + axisLabel_formatter(param.data[2], index, fd.y_axis_format)+'%',
            ].join('<br/>')
        }
        return {
            formatter: formatter,
        }
    } else if (type == "cal_heatmap"){
        return {
            formatter: function (data) {
                return data.value[0] + '<br/>' + data.value[1]
            }
        }
    }else if (type == "big_number" || type == "big_number_total") {
        function formatter(params, index) {
            var params_data = []
            for (let j = 0; j < params.length; j++) {
                params_data.push(`<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${params[j].color};"></span>` + axisLabel_formatter(params[j].data, index, fd.y_axis_format));
            }
            return params[0].name + '</br>' + params_data.join('</br>')
        }
        return {
            confine: true,
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: formatter
        }
    } else if (type == "box_plot") {
        function formatter(param) {
            return [
                '项目 ' + param.name + ': ',
                '最大值: ' + param.data[0],
                'Q1: ' + param.data[1],
                '中位数: ' + param.data[2],
                'Q3: ' + param.data[3],
                '最小值: ' + param.data[4]
            ].join('<br/>')
        }
        return {
            formatter: formatter,
        }
    } else if (type == "bubble") {

        function formatter(obj) {
            var value = fd.stat_function == null ? (obj.value == undefined ? obj[0].value : obj.value) : obj[0].data;
            var series_name = obj.value == undefined ? obj[0].seriesName : obj.seriesName;
            var tip_series_name = fd.stat_function == null ? series_name : obj[0].seriesName;
            return '<div style="width:200px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;border-bottom: 1px solid rgba(255,255,255,.3); font-size: 18px;padding-bottom: 7px;margin-bottom: 7px">' +
                value[3] + ' (' + tip_series_name + ')' +
                '</div>' +
                schema[0].text + '：' + value[0] + '<br>' +
                schema[1].text + '：' + value[1] + '<br>' +
                schema[2].text + '：' + value[2] + '<br>';
        }
        var trigger = fd.stat_function == null ? 'item' : 'axis'
        return {
            trigger: trigger,
            confine: true,
            padding: 10,
            backgroundColor: '#222',
            borderColor: '#777',
            borderWidth: 1,
            formatter: formatter,
        }
    } else {
        return {
            confine: true,
        }
    }
}

//刷新间隔下拉选择
$(function () {
    $(".refresh_select p").click(function (e) {
        $(".refresh_select").toggleClass('open');
        e.stopPropagation();
    });


    $(".refresh_select ul li").click(function (e) {
        var _this = $(this);
        $(".refresh_select > p").text(_this.attr('data-value'));
        $(".refresh_select > p").attr('data-time',_this.attr('data-time'));
        _this.addClass("Selected").siblings().removeClass("Selected");
        $(".refresh_select").removeClass("open");
        e.stopPropagation();
    });


    $(document).on('click', function () {
        $(".refresh_select").removeClass("open");
    })


});