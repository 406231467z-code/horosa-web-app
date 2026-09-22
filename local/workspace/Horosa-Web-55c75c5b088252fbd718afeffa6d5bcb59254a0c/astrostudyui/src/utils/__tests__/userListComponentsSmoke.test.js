// 编译冒烟锁:ChartList/CaseList/ChartData/CaseData 是公私共用、高频批量改动的管理面组件,
// 多数只被 pages/index.js 引用 —— 单跑 utils 套件时 JSX/import 断裂不会现形,这里补一道
// 「import 即编译」的最低闸(组件面批量改纪律:收口必须编译零 error)。
import ChartList, { isEditableChartRecord } from '../../components/user/ChartList';
import ChartData from '../../components/user/ChartData';
import ChartAddFormComp from '../../components/user/ChartAddFormComp';

it('user management components import cleanly (compile canary)', ()=>{
	[ChartList, ChartData, ChartAddFormComp].forEach((c)=>{
		expect(typeof c).toBe('function');
	});
	expect(typeof isEditableChartRecord).toBe('function');
});
